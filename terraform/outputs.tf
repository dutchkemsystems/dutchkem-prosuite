output "ecs_cluster_name" {
  value = aws_ecs_cluster.prosuite.name
}

output "ecs_service_name" {
  value = aws_ecs_service.prosuite.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.prosuite.arn
}

output "load_balancer_dns" {
  value = aws_lb.prosuite.dns_name
}

output "load_balancer_arn" {
  value = aws_lb.prosuite.arn
}

output "security_group_id" {
  value = aws_security_group.prosuite.id
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.prosuite.name
}

output "vpc_id" {
  value       = aws_vpc.prosuite.id
  description = "ID of the ProSuite VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs of the public subnets"
}

output "internet_gateway_id" {
  value       = aws_internet_gateway.prosuite.id
  description = "ID of the internet gateway"
}

output "ecs_task_role_arn" {
  value       = aws_iam_role.ecs_task.arn
  description = "ARN of the ECS task role"
}

output "secrets_jwt_secret_arn" {
  value       = aws_secretsmanager_secret.jwt_secret.arn
  description = "ARN of the JWT_SECRET secret"
}

output "secrets_database_url_arn" {
  value       = aws_secretsmanager_secret.database_url.arn
  description = "ARN of the DATABASE_URL secret"
}

output "secrets_redis_url_arn" {
  value       = aws_secretsmanager_secret.redis_url.arn
  description = "ARN of the REDIS_URL secret"
}
