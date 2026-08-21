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
