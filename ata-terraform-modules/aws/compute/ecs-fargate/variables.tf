variable "cluster_name" {
  type        = string
  description = "ECS Cluster Name"
  default     = "main-ecs-cluster"
}

variable "service_name" {
  type        = string
  description = "ECS Service Name"
  default     = "app-service"
}

variable "container_image" {
  type        = string
  description = "Container image to deploy"
  default     = "nginx:alpine"
}

variable "container_port" {
  type        = number
  description = "Port the container listens on"
  default     = 80
}

variable "cpu" {
  type        = string
  description = "Fargate CPU units (256, 512, 1024, etc.)"
  default     = "256"
}

variable "memory" {
  type        = string
  description = "Fargate Memory (512, 1024, 2048, etc.)"
  default     = "512"
}

variable "instance_count" {
  type        = number
  description = "Desired count of tasks"
  default     = 2
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for ECS tasks"
}

variable "security_group_id" {
  type        = string
  description = "Security group for ECS tasks"
}

variable "target_group_arn" {
  type        = string
  description = "Optional ALB Target Group ARN"
  default     = null
}

variable "aws_region" {
  type        = string
  description = "AWS Region for CloudWatch logging"
  default     = "us-east-1"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
