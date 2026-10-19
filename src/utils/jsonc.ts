/**
 * Strips comments (// and /* *\/) and trailing commas from JSON strings.
 * Preserves strings so slashes inside quotes are not removed.
 */
export function stripJsonComments(input: string): string {
  let insideString = false;
  let stringQuote = "";
  let insideBlockComment = false;
  let insideLineComment = false;
  let escaped = false;
  let output = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    const nextChar = input[i + 1] ?? "";

    if (insideString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        insideString = false;
      }
      continue;
    }

    if (insideBlockComment) {
      if (char === "*" && nextChar === "/") {
        insideBlockComment = false;
        i++; // skip /
      }
      continue;
    }

    if (insideLineComment) {
      if (char === "\n" || char === "\r") {
        insideLineComment = false;
        output += char;
      }
      continue;
    }

    // Check for comment starts
    if (char === "/" && nextChar === "*") {
      insideBlockComment = true;
      i++;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      insideLineComment = true;
      i++;
      continue;
    }

    // Check for string start
    if (char === '"' || char === "'") {
      insideString = true;
      stringQuote = char;
      output += char;
      continue;
    }

    output += char;
  }

  // Remove trailing commas before } or ]
  return output.replace(/,\s*([\]}])/g, "$1");
}

/**
 * Safely parses JSON with comments and trailing commas.
 * Returns null if parsing fails instead of throwing.
 */
export function parseJsonc<T = unknown>(input: string): T | null {
  try {
    const cleaned = stripJsonComments(input);
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
