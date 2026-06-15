output "web_sg_id" {
  value       = aws_security_group.web.id
  description = "The ID of the Web security group"
}

output "app_sg_id" {
  value       = aws_security_group.app.id
  description = "The ID of the App security group"
}

output "db_sg_id" {
  value       = aws_security_group.db.id
  description = "The ID of the Database security group"
}
