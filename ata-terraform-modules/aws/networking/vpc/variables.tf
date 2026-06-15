variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = number
  description = "Number of AZs to cover"
  default     = 2
}

variable "enable_nat_gateway" {
  type        = boolean
  description = "Provision a NAT Gateway"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
