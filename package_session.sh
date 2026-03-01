#!/bin/bash
# FamilyTime Session Transfer Script
# Run from anywhere — it finds the project automatically

PROJECT_DIR="$HOME/Documents/familytime2"
OUTPUT_DIR="$HOME/Desktop"
TIMESTAMP=$(date +"%Y%m%d_%H%M")
OUTPUT_FILE="$OUTPUT_DIR/familytime_session_$TIMESTAMP.zip"
TREE_FILE="$PROJECT_DIR/PROJECT_TREE.txt"

echo "================================"
echo "  FamilyTime Session Packager"
echo "================================"

# Check project exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "ERROR: Project not found at $PROJECT_DIR"
  echo "Edit PROJECT_DIR in this script to match your path."
  exit 1
fi

cd "$PROJECT_DIR"

# Generate file tree
echo "Generating file tree..."
if command -v tree &> /dev/null; then
  tree -I 'node_modules|.next|.git|*.tsbuildinfo' --dirsfirst > "$TREE_FILE"
else
  find . -not \( -path './node_modules/*' -o -path './.next/*' -o -path './.git/*' \) | sort > "$TREE_FILE"
fi

# Write session notes header into tree file
TEMP=$(mktemp)
cat > "$TEMP" << HEADER
FamilyTime - Session Transfer Package
Generated: $(date)
Live URL:  https://hubler.vercel.app
Repo:      https://github.com/hubl3r/FamilyTime.git
Stack:     Next.js 16 + NextAuth + Supabase + Vercel
------------------------------------------------
CURRENT STATE:
- Auth: NextAuth with email/password (in-memory, needs Supabase)
- StylePicker: built but not yet wired to app CSS variables
- Finances module: mock data, needs Supabase backend
- Documents module: mock data, needs Supabase backend
- Stub modules: chores, meals, prayer, events, members

NEXT PRIORITIES:
- Wire StylePicker to apply CSS variables across app
- Build Supabase backend for auth, finances, documents
- Financial tracker: accounts, credit cards, loans, amortization

------------------------------------------------
FILE TREE:
HEADER

cat "$TREE_FILE" >> "$TEMP"
mv "$TEMP" "$TREE_FILE"

# Create zip
echo "Creating zip package..."
zip -r "$OUTPUT_FILE" \
  src/ \
  package.json \
  tsconfig.json \
  next.config.ts \
  .env.local.template \
  PROJECT_TREE.txt \
  --exclude "*/node_modules/*" \
  --exclude "*/.next/*" \
  --exclude "*/.git/*" \
  --exclude "*.tsbuildinfo" \
  2>/dev/null

echo ""
echo "Done! Package saved to:"
echo "  $OUTPUT_FILE"
echo ""
echo "Upload this zip at the start of your next Claude session."
