#!/bin/bash

echo "🚀 Starting HMS Frontend, Backend & Mobile App..."

# Exit immediately if any command fails
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

# Support running the script from the repo root or from the parent folder that holds the repo
if [ -d "$script_dir/hms-backend" ]; then
  root_dir="$script_dir"
elif [ -d "$script_dir/taskforce20/hms-backend" ]; then
  root_dir="$script_dir/taskforce20"
else
  echo "Could not find hms-backend. Run this script from the repo folder or its parent."
  exit 1
fi

# Start backend
echo "🔧 Starting Backend..."
(cd "$root_dir/hms-backend" && npm run dev) &

# Start frontend
echo "🌐 Starting Frontend..."
(cd "$root_dir/hms-frontend" && npm run dev) &

# Start mobile (Expo)
echo "📱 Starting Mobile App..."
(cd "$root_dir/hms-mobile" && npx expo start) &

# Wait for all background processes
wait
