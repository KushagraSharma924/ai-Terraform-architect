variable "vpc_id" {
  type        = string
  description = "VPC ID to assign security groups to"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
