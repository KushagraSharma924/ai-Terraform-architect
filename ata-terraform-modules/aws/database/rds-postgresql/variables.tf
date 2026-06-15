variable "name" {
  type        = string
  description = "DB Instance Identifier"
  default     = "main-postgres-db"
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL Engine Version"
  default     = "15.4"
}

variable "instance_class" {
  type        = string
  description = "PostgreSQL Instance Class"
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  type        = number
  description = "Database allocated storage (GB)"
  default     = 20
}

variable "db_name" {
  type        = string
  description = "Initial database name"
  default     = "appdb"
}

variable "username" {
  type        = string
  description = "Database administrator username"
  default     = "dbadmin"
}

variable "password" {
  type        = string
  description = "Database administrator password"
  sensitive   = true
}

variable "subnet_ids" {
  type        = list(string)
  description = "VPC Subnet IDs for DB Subnet Group"
}

variable "security_group_id" {
  type        = string
  description = "VPC Security Group ID for database access"
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
