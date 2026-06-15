variable "name" {
  type        = string
  description = "ALB Name"
  default     = "main-alb"
}

variable "internal" {
  type        = bool
  description = "Whether the ALB is internal or public-facing"
  default     = false
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnets for ALB"
}

variable "security_group_id" {
  type        = string
  description = "Security group for ALB"
}

variable "target_port" {
  type        = number
  description = "Target port for backend resources"
  default     = 80
}

variable "target_type" {
  type        = string
  description = "Target type: instance or ip"
  default     = "instance"
}

variable "health_check_path" {
  type        = string
  description = "Health check path"
  default     = "/"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
