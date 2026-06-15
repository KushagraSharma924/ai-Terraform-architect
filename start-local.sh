#!/bin/bash

# Trap Ctrl+C (SIGINT) to terminate all background jobs
trap cleanup INT

cleanup() {
  echo -e "\nStopping all services..."
  # Kill all background processes spawned by this script
  jobs -p | xargs kill 2>/dev/null
  echo "All services stopped."
  exit 0
}

echo "Building shared packages..."
# 1. Build Shared Types
echo "→ Building ata-shared-types..."
(cd ata-shared-types && npm install && npm run build)

# 2. Build LLM Provider Lib
echo "→ Building ata-llm-provider-lib..."
(cd ata-llm-provider-lib && npm install && npm run build)

echo "Running migrations..."
# Run migrations for all three DB services
echo "→ Migrating auth-service..."
(cd ata-auth-service && npm install && npm run db:migrate)

echo "→ Migrating project-service..."
(cd ata-project-service && npm install && npm run db:migrate)

echo "→ Migrating intent-service..."
(cd ata-intent-service && npm install && npm run db:migrate)

echo "→ Migrating terraform-generator-service..."
(cd ata-terraform-generator-service && npm install && npm run db:migrate)

# Create a logs directory
mkdir -p logs

echo "Starting services in background... Logs will be written to the 'logs' folder."

# Start auth service
echo "→ Starting auth-service on port 3001..."
(cd ata-auth-service && npm run start:dev > ../logs/auth-service.log 2>&1) &

# Start project service
echo "→ Starting project-service on port 3002..."
(cd ata-project-service && npm run start:dev > ../logs/project-service.log 2>&1) &

# Start intent service
echo "→ Starting intent-service on port 3004..."
(cd ata-intent-service && npm run start:dev > ../logs/intent-service.log 2>&1) &

# Start terraform generator service
echo "→ Starting terraform-generator-service on port 3005..."
(cd ata-terraform-generator-service && npm run start:dev > ../logs/terraform-generator-service.log 2>&1) &

# Start gateway proxy
echo "→ Starting gateway proxy on port 3000..."
(cd ata-gateway && npm install && npm run start:dev > ../logs/gateway.log 2>&1) &

# Start frontend UI
echo "→ Starting frontend on port 3003..."
(cd ata-frontend && npm install && PORT=3003 npm run dev > ../logs/frontend.log 2>&1) &

echo ""
echo "========================================================"
echo "🎉 All services started successfully!"
echo "- Frontend client: http://localhost:3003"
echo "- Gateway URL: http://localhost:3000"
echo "- Watch logs in real-time using: tail -f logs/*.log"
echo "- Press [Ctrl+C] to stop all services."
echo "========================================================"

# Keep the script running to maintain background jobs
while true; do
  sleep 1
done
