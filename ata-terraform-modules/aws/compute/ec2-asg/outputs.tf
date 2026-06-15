output "asg_name" {
  value       = aws_autoscaling_group.this.name
  description = "The name of the Auto Scaling Group"
}

output "asg_arn" {
  value       = aws_autoscaling_group.this.arn
  description = "The ARN of the Auto Scaling Group"
}
