terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data Sources ────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ─────────────────────────────────────────────────────────────

resource "aws_vpc" "prosuite" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "prosuite-vpc"
  }
}

# ── Public Subnets ──────────────────────────────────────────────────

resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.prosuite.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "prosuite-public-${count.index}"
  }
}

# ── Internet Gateway ───────────────────────────────────────────────

resource "aws_internet_gateway" "prosuite" {
  vpc_id = aws_vpc.prosuite.id

  tags = {
    Name = "prosuite-igw"
  }
}

# ── Route Table ─────────────────────────────────────────────────────

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.prosuite.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.prosuite.id
  }

  tags = {
    Name = "prosuite-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── Secrets Manager ─────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "prosuite/JWT_SECRET"
  description = "JWT signing secret for ProSuite"
}

resource "aws_secretsmanager_secret" "database_url" {
  name        = "prosuite/DATABASE_URL"
  description = "Database connection URL for ProSuite"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "prosuite/REDIS_URL"
  description = "Redis connection URL for ProSuite"
}

# ── IAM Execution Role ─────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name = "prosuite-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ── IAM Task Role ──────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task" {
  name = "prosuite-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  name = "prosuite-task-secrets-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.redis_url.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/ecs/prosuite:*"
      }
    ]
  })
}

# ── Security Groups ─────────────────────────────────────────────────

resource "aws_security_group" "prosuite" {
  name        = "prosuite-sg"
  description = "ProSuite frontend service"
  vpc_id      = aws_vpc.prosuite.id

  ingress {
    from_port   = 4173
    to_port     = 4173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "alb" {
  name        = "prosuite-alb-sg"
  description = "ALB ingress"
  vpc_id      = aws_vpc.prosuite.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── ECS Cluster ────────────────────────────────────────────────────

resource "aws_ecs_cluster" "prosuite" {
  name = "prosuite-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── ECS Task Definition ────────────────────────────────────────────

resource "aws_ecs_task_definition" "prosuite" {
  family                   = "prosuite"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "prosuite"
      image     = var.ecr_image
      essential = true
      portMappings = [
        { containerPort = 4173, protocol = "tcp" }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "VITE_CONVEX_URL", value = "https://warmhearted-aardvark-280.convex.cloud" }
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "REDIS_URL", valueFrom = aws_secretsmanager_secret.redis_url.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.prosuite.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "prosuite"
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "prosuite" {
  name              = "/ecs/prosuite"
  retention_in_days = 30
}

# ── ALB ─────────────────────────────────────────────────────────────

resource "aws_lb" "prosuite" {
  name               = "prosuite-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "prosuite" {
  name        = "prosuite-tg"
  port        = 4173
  protocol    = "HTTP"
  vpc_id      = aws_vpc.prosuite.id
  target_type = "ip"
}

resource "aws_lb_listener" "prosuite" {
  load_balancer_arn = aws_lb.prosuite.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prosuite.arn
  }
}

resource "aws_lb_target_group_attachment" "prosuite" {
  target_group_arn = aws_lb_target_group.prosuite.arn
  target_id        = aws_ecs_service.prosuite.id
}

# ── ECS Service ─────────────────────────────────────────────────────

resource "aws_ecs_service" "prosuite" {
  name            = "prosuite"
  cluster         = aws_ecs_cluster.prosuite.id
  task_definition = aws_ecs_task_definition.prosuite.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.prosuite.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.prosuite.arn
    container_name   = "prosuite"
    container_port   = 4173
  }

  depends_on = [aws_lb_listener.prosuite]
}
