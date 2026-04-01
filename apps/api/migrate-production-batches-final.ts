// This file contains all the PostgreSQL migrations for the remaining methods in production-batches.repository.ts
// Run this to see what needs to be migrated

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src/repositories/production-batches.repository.ts');
const content = fs.readFileSync(filePath, 'utf-8');

// Find all lines with 'await supabase'
const lines = content.split('\n');
const supabaseLines: number[] = [];

lines.forEach((line, index) => {
  if (line.includes('await supabase') || line.includes('await supabase.from')) {
    supabaseLines.push(index + 1); // Line numbers start from 1
  }
});

console.log(`Found ${supabaseLines.length} Supabase calls at lines:`);
console.log(supabaseLines.join(', '));

// List the methods that still have Supabase
const methodRegex = /async\s+(\w+)\s*\(/g;
let match;
const methods = new Map<string, number>();

while ((match = methodRegex.exec(content)) !== null) {
  const methodName = match[1];
  const startPos = match.index;

  // Find if this method contains supabase
  const methodStart = content.indexOf(match[0], startPos);
  const nextMethod = content.indexOf('async ', methodStart + 1);
  const methodContent = nextMethod > 0
    ? content.substring(methodStart, nextMethod)
    : content.substring(methodStart);

  if (methodContent.includes('await supabase')) {
    const lineNumber = content.substring(0, startPos).split('\n').length;
    methods.set(methodName, lineNumber);
  }
}

console.log('\nMethods still using Supabase:');
methods.forEach((lineNum, methodName) => {
  console.log(`- ${methodName} (line ${lineNum})`);
});
