resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = var.tags
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = var.tags
}

resource "aws_subnet" "public" {
  count                   = var.availability_zones
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(var.tags, { Name = "public-${count.index}" })
}

resource "aws_subnet" "private" {
  count             = var.availability_zones
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + var.availability_zones)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = merge(var.tags, { Name = "private-${count.index}" })
}

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"
  tags   = var.tags
}

resource "aws_nat_gateway" "this" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags          = var.tags
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = merge(var.tags, { Name = "public" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.this[0].id
    }
  }
  tags = merge(var.tags, { Name = "private" })
}

resource "aws_route_table_association" "public" {
  count          = var.availability_zones
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.availability_zones
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

data "aws_availability_zones" "available" {
  state = "available"
}
