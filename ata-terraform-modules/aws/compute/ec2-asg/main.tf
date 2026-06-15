resource "aws_launch_template" "this" {
  name_prefix   = "asg-template-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.security_group_id]
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              echo "Hello, World" > index.html
              nohup busybox httpd -f -p 80 &
              EOF
  )

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_autoscaling_group" "this" {
  vpc_zone_identifier = var.private_subnet_ids
  desired_capacity    = var.min_size
  max_size            = var.max_size
  min_size            = var.min_size

  launch_template {
    id      = aws_launch_template.this.id
    version = "$Latest"
  }

  target_group_arns = var.target_group_arn != null ? [var.target_group_arn] : []

  tag {
    key                 = "Name"
    value               = "asg-instance"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}
