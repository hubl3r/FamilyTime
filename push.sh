#!/bin/bash
# ================================================================
# FamilyTime — push to GitHub (Vercel auto-deploys on push)
# Usage: bash push.sh "your commit message"
# ================================================================

set -e

# ── Colour helpers ────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}🏡 FamilyTime — Deploy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Must be run from repo root ────────────────────────────
if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
  fail "Run this from the FamilyTime project root"
fi
ok "Project root confirmed"

# ── 2. Commit message ────────────────────────────────────────
MSG="${1:-}"
if [ -z "$MSG" ]; then
  # Auto-generate from changed file count
  CHANGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((CHANGED + UNSTAGED))
  MSG="update: ${TOTAL} file(s) changed"
  warn "No commit message given — using: \"${MSG}\""
  warn "  Tip: bash push.sh \"feat: your message here\""
fi

# ── 3. Check for .env.local in staged files ──────────────────
if git diff --cached --name-only 2>/dev/null | grep -q ".env.local$"; then
  fail ".env.local is staged! Remove it: git reset HEAD .env.local"
fi
ok ".env.local not staged"

# ── 4. TypeScript build check ────────────────────────────────
info "Running TypeScript check..."
if ! npx tsc --noEmit --skipLibCheck 2>/dev/null; then
  echo ""
  warn "TypeScript errors found. Run 'npx tsc --noEmit' to see them."
  echo -n "  Push anyway? (y/N): "
  read -r CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    fail "Aborted — fix TypeScript errors first"
  fi
  warn "Pushing with TypeScript errors (Vercel build may fail)"
else
  ok "TypeScript check passed"
fi

# ── 5. Stage all changes ─────────────────────────────────────
info "Staging changes..."
git add .

# Check if there's anything to commit
if git diff --cached --quiet; then
  warn "Nothing to commit — working tree clean"
  echo ""
  info "Current branch: $(git branch --show-current)"
  info "Last commit:    $(git log --oneline -1)"
  exit 0
fi

# Show what's being committed
echo ""
echo -e "${CYAN}Files being committed:${NC}"
git diff --cached --name-status | sed 's/^/  /'
echo ""

# ── 6. Commit ────────────────────────────────────────────────
git commit -m "$MSG"
ok "Committed: \"$MSG\""

# ── 7. Push ──────────────────────────────────────────────────
BRANCH=$(git branch --show-current)
info "Pushing to origin/${BRANCH}..."
git push origin "$BRANCH"
ok "Pushed to GitHub"

# ── 8. Done ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}${BOLD}🚀 Deployed!${NC}"
echo ""
echo -e "  GitHub:  ${CYAN}https://github.com/hubl3r/FamilyTime${NC}"
echo -e "  Vercel:  ${CYAN}https://vercel.com/dashboard${NC}  (building now ~60s)"
echo -e "  Live:    ${CYAN}https://hubler.vercel.app${NC}"
echo ""
