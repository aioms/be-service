#!/bin/bash

DATE=$(date '+%Y-%m-%d-%H-%M-%S')
GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
BUILD_DATE=$(date +%Y%m%d%H%M)
TAG="$GIT_COMMIT_HASH-$BUILD_DATE"

ENV="development"
SERVICE_NAME="aios-backend-app"
IMAGE="102205/$SERVICE_NAME:$TAG"

# Function to display script usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo " -h, --help                     Display this help message"
  echo " -b, --build (default: false)   Run cloud build"
  echo " -d, --deploy (default: false)  Run cloud deploy"
  echo " --dev, --prod                  Select either staging or production project"
}

has_argument() {
  [[ ("$1" == *=* && -n ${1#*=}) || (! -z "$2" && "$2" != -*) ]]
}

extract_argument() {
  echo "${2:-${1#*=}}"
}

build_image() {
  echo "Building the container image... $IMAGE"
  docker build -t aios-apis .
  echo "-------------------"
}

deploy_backend_app() {
  echo "Deploying to Docker Hub..."
  # gcloud run services describe order-service --format export >deployments/order-service.yaml
  # gcloud run services replace "./deployments/order-service.$env.yaml"

  echo "-------------------"
}

check_env() {
  while [ $# -gt 0 ]; do
    case $1 in
    --dev)
      echo "Staging environment".
      ENV="development"
      ;;
    --prod)
      echo "Production environment".
      ENV="production"
      ;;
    esac
    shift
  done
}

# Function to handle options and arguments
handle_options() {
  while [ $# -gt 0 ]; do
    case $1 in
    -h | --help)
      usage
      exit 0
      ;;
    -b | --build)
      build_image
      ;;
    -d | --deploy)
      deploy_backend_app
      ;;
    --dev | --prod) ;;
    *)
      echo "Invalid option: $1" >&2
      usage
      exit 1
      ;;
    esac
    shift
  done
}

if (($# == 0)); then
  echo "No arguments provided. Use -h or --help for usage."
else
  check_env "$@"
  handle_options "$@"
fi

# Ref: https://medium.com/@wujido20/handling-flags-in-bash-scripts-4b06b4d0ed04
