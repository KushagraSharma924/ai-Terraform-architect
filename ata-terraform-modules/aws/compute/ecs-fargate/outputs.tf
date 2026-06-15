output "cluster_arn" {
  value       = aws_ecs_cluster.this.arn
  description = "The ARN of the ECS cluster"
}

output "service_name" {
  value       = aws_ecs_service.this.name
  description = "The name of the ECS service"
}
