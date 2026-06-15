variable "instance_type" {
  type        = string
  description = "EC2 Instance Type"
  default     = "t3.medium"
}

variable "min_size" {
  type        = number
  description = "ASG Minimum Size"
  default     = 2
}

variable "max_size" {
  type        = number
  description = "ASG Maximum Size"
  default     = 6
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for instances"
}

variable "security_group_id" {
  type        = string
  description = "Security group for instances"
}

variable "target_group_arn" {
  type        = string
  description = "Optional Load Balancer Target Group ARN"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
