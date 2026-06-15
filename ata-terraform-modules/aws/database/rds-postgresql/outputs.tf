output "db_endpoint" {
  value       = aws_db_instance.this.endpoint
  description = "The database endpoint address and port"
}

output "db_id" {
  value       = aws_db_instance.this.id
  description = "The database instance ID"
}
