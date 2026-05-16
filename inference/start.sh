#!/bin/bash
# IntelliBank ML Inference Service — Unix Startup Script
# Usage: ./start.sh [port]

PORT=${1:-8001}
MODELS_DIR=${MODELS_DIR:-"../models"}

echo ""
echo "  IntelliBank ML Inference Service"
echo "  Port: $PORT  |  Models: $MODELS_DIR"
echo ""

export MODELS_DIR=$MODELS_DIR
export PORT=$PORT

python -m uvicorn main:app --host 0.0.0.0 --port $PORT --reload
