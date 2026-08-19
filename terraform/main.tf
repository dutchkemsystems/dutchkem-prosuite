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

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ecr_image" {
  type    = string
  default = "dutchkem/prosuite:latest"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for the Fargate service"
  default     = ""
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the Fargate service"
  default     = []
}

# ── ECS Cluster ───────────────────────────────────────────────────
resource "aws_ecs_cluster" "prosuite" {
  name = "prosuite-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── ECS Task Definition ───────────────────────────────────────────
resource "aws_ecs_task_definition" "prosuite" {
  family                   = "prosuite"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

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
  name = "/ecs/prosuite"
  retention_in_days = 30
}

# ── ECS Service ───────────────────────────────────────────────────
resource "aws_ecs_service" "prosuite" {
  name            = "prosuite"
  cluster         = aws_ecs_cluster.prosuite.id
  task_definition = aws_ecs_task_definition.prosuite.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.prosuite.id]
    assign_public_ip = false
  }
}

resource "aws_security_group" "prosuite" {
  name        = "prosuite-sg"
  description = "ProSuite frontend service"
  vpc_id      = var.vpc_id

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

# ── IAM ───────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name = "prosuite-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ── ALB (optional) ────────────────────────────────────────────────
resource "aws_lb" "prosuite" {
  name               = "prosuite-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.subnet_ids
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_security_group" "alb" {
  name        = "prosuite-alb-sg"
  description = "ALB ingress"
  vpc_id      = var.vpc_id

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

resource "aws_lb_target_group" "prosuite" {
  name     = "prosuite-tg"
  port     = 4173
  protocol = "HTTP"
  vpc_id   = var.vpc_id
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