/**
 * EcoLang Compiler Studio - Core Compiler Engine
 * Implementing:
 * 1. Lexical Analysis (Scanner)
 * 2. Syntax Analysis (Parser for expressions & statements)
 * 3. Semantic Analysis & Symbol Table Generator
 * 4. Intermediate Representation (Three Address Code)
 * 5. Code Optimization (Folding, Propagation, Simplification, DCE)
 * 6. Target Code Generation (JavaScript)
 * 7. Real-time Pipeline Visualizer
 * 8. Exporters and Test Case Manager
 */

// Sample code template (Valid program)
const sample = `SAMPAH botol = 100
SAMPAH kardus = 50
TOTAL = botol + kardus
TAMPILKAN TOTAL`;

// Preset Test Cases for Compiler Testing
const testCases = {
  valid: `SAMPAH botol = 100
SAMPAH kardus = 50
TOTAL = botol + kardus
TAMPILKAN TOTAL`,

  undeclared: `SAMPAH botol = 100
TOTAL = botol + kardus
TAMPILKAN TOTAL`,

  duplicate: `SAMPAH botol = 100
SAMPAH botol = 200
TAMPILKAN botol`,

  syntax: `SAMPAH = 100
botol = + 50
TAMPILKAN`,

  arithmetic: `SAMPAH A = 10
SAMPAH B = 20
SAMPAH C = 5
TOTAL = A + B * C / (2 + 3)
TAMPILKAN TOTAL`,

  optimization: `SAMPAH X = 10
SAMPAH Y = 20
SAMPAH Z = 5
TEMP = X + Y + Z
RESULT = TEMP * 2
TAMPILKAN RESULT`,

  simplification: `SAMPAH A = 50
B = A + 0
C = B * 1
D = C * 0
TAMPILKAN D`,

  largeData: `SAMPAH botol = 120
SAMPAH kardus = 80
SAMPAH plastik = 65
SAMPAH kaleng = 40
SAMPAH kaca = 30
SAMPAH kertas = 70
TOTAL1 = botol + kardus
TOTAL2 = plastik + kaleng
TOTAL3 = kaca + kertas
GRAND_TOTAL = TOTAL1 + TOTAL2 + TOTAL3
TAMPILKAN GRAND_TOTAL`,

  parentheses: `SAMPAH A = 15
SAMPAH B = 5
SAMPAH C = 2
SAMPAH D = 1
RESULT = (A - B) * (C + D)
TAMPILKAN RESULT`
};

// Initialize editor on page load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("editor").value = sample;
  compileEco(); // Run initial compilation
});

// Helper: Sleep function for compiler pipeline animation
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stage 1: Lexical Analysis (Scanning)
 * Scans the input string line-by-line and generates token streams.
 * Tracks line and column positions.
 */
function lexical(code) {
  const lines = code.split("\n");
  let tokens = [];
  let errors = [];

  for (let i = 0; i < lines.length; i++) {
    let lineText = lines[i];
    let col = 0;
    while (col < lineText.length) {
      let char = lineText[col];

      // Skip whitespace
      if (/\s/.test(char)) {
        col++;
        continue;
      }

      // Match keywords/identifiers (e.g. SAMPAH, TAMPILKAN, TOTAL, etc.)
      let idMatch = lineText.slice(col).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (idMatch) {
        let value = idMatch[0];
        let type = "Identifier";
        if (value === "SAMPAH" || value === "TAMPILKAN") {
          type = "Keyword";
        }
        tokens.push({
          type: type,
          value: value,
          line: i + 1,
          col: col + 1
        });
        col += value.length;
        continue;
      }

      // Match numeric constants
      let numMatch = lineText.slice(col).match(/^\d+/);
      if (numMatch) {
        let value = numMatch[0];
        tokens.push({
          type: "Number",
          value: value,
          line: i + 1,
          col: col + 1
        });
        col += value.length;
        continue;
      }

      // Match operators (+, -, *, /, =)
      let opMatch = lineText.slice(col).match(/^[=+*/-]/);
      if (opMatch) {
        let value = opMatch[0];
        tokens.push({
          type: "Operator",
          value: value,
          line: i + 1,
          col: col + 1
        });
        col += value.length;
        continue;
      }

      // Match punctuation (parentheses)
      let punctMatch = lineText.slice(col).match(/^[()]/);
      if (punctMatch) {
        let value = punctMatch[0];
        tokens.push({
          type: "Punctuation",
          value: value,
          line: i + 1,
          col: col + 1
        });
        col += value.length;
        continue;
      }

      // Lexical error: illegal character
      errors.push({
        line: i + 1,
        type: "Lexical Error",
        message: `Illegal character '${char}'`,
        suggest: `Remove the illegal character '${char}' or replace it with a valid identifier, number, or mathematical operator.`
      });
      col++;
    }
  }

  return { tokens, errors };
}

/**
 * Stage 2: Syntax Analysis (Parsing)
 * Parses tokens into an Abstract Syntax Tree (AST) using recursive descent.
 * Supports operator precedence (*, / before +, -) and parentheses.
 */
function parse(tokens) {
  let index = 0;
  let errors = [];

  function peek() {
    return tokens[index] || null;
  }

  function next() {
    return tokens[index++];
  }

  function consume(type, value, errMsg) {
    let t = peek();
    if (!t) {
      throw {
        message: errMsg + " (Reached end of program)",
        line: tokens[tokens.length - 1]?.line || 1
      };
    }
    if (t.type === type && (!value || t.value === value)) {
      return next();
    }
    throw { message: errMsg + `, got '${t.value}'`, line: t.line };
  }

  // Expression parsing: handles '+' and '-'
  function parseExpression() {
    let node = parseTerm();
    while (peek() && peek().type === "Operator" && (peek().value === "+" || peek().value === "-")) {
      let opToken = next();
      let right = parseTerm();
      node = {
        type: "BinaryExpr",
        op: opToken.value,
        left: node,
        right: right,
        line: opToken.line
      };
    }
    return node;
  }

  // Term parsing: handles '*' and '/'
  function parseTerm() {
    let node = parseFactor();
    while (peek() && peek().type === "Operator" && (peek().value === "*" || peek().value === "/")) {
      let opToken = next();
      let right = parseFactor();
      node = {
        type: "BinaryExpr",
        op: opToken.value,
        left: node,
        right: right,
        line: opToken.line
      };
    }
    return node;
  }

  // Factor parsing: handles Numbers, Identifiers, and Parentheses
  function parseFactor() {
    let t = peek();
    if (!t) {
      throw {
        message: "Expected number, variable, or parenthesis",
        line: tokens[tokens.length - 1]?.line || 1
      };
    }

    if (t.type === "Number") {
      next();
      return { type: "Number", value: t.value, line: t.line };
    }

    if (t.type === "Identifier") {
      next();
      return { type: "Identifier", name: t.value, line: t.line };
    }

    if (t.type === "Punctuation" && t.value === "(") {
      next(); // consume '('
      let expr = parseExpression();
      consume("Punctuation", ")", "Expected closing parenthesis ')'");
      return expr;
    }

    throw { message: `Expected number, variable, or parenthesis but got '${t.value}'`, line: t.line };
  }

  // Statement parsing
  function parseStatement() {
    let t = peek();
    if (!t) return null;

    if (t.type === "Keyword" && t.value === "SAMPAH") {
      let startLine = t.line;
      next(); // consume SAMPAH
      let idToken = consume("Identifier", null, "Expected variable name after 'SAMPAH'");
      consume("Operator", "=", "Expected '=' after variable name");
      let expr = parseExpression();
      return {
        type: "Declaration",
        name: idToken.value,
        value: expr,
        line: startLine
      };
    } else if (t.type === "Keyword" && t.value === "TAMPILKAN") {
      let startLine = t.line;
      next(); // consume TAMPILKAN
      let expr = parseExpression();
      return {
        type: "Output",
        value: expr,
        line: startLine
      };
    } else if (t.type === "Identifier") {
      let startLine = t.line;
      let idToken = next();
      consume("Operator", "=", "Expected '=' after variable name in assignment");
      let expr = parseExpression();
      return {
        type: "Assignment",
        name: idToken.value,
        value: expr,
        line: startLine
      };
    } else {
      throw { message: `Unexpected token '${t.value}' at start of statement`, line: t.line };
    }
  }

  // Helper for generating syntax suggestions
  function getSyntaxSuggestion(msg) {
    if (msg.includes("Expected variable name after 'SAMPAH'")) {
      return "Declare variables using the format: SAMPAH <variable_name> = <expression>";
    }
    if (msg.includes("Expected '=' after variable name")) {
      return "Assign values using the assignment operator '=': SAMPAH <variable_name> = <expression>";
    }
    if (msg.includes("Expected closing parenthesis")) {
      return "Ensure all opening parentheses '(' have a matching closing parenthesis ')'.";
    }
    if (msg.includes("Expected '=' after variable name in assignment")) {
      return "Correct the variable assignment format: <variable_name> = <expression>";
    }
    return "Check for syntax errors, typos, or missing operators in this statement.";
  }

  let statements = [];
  while (peek()) {
    try {
      let stmt = parseStatement();
      if (stmt) statements.push(stmt);
    } catch (e) {
      errors.push({
        line: e.line,
        type: "Syntax Error",
        message: e.message,
        suggest: getSyntaxSuggestion(e.message)
      });

      // Synchronize parser: skip remaining tokens on the same line to recover
      let currentLine = peek()?.line;
      while (peek() && peek().line === currentLine) {
        next();
      }
    }
  }

  return { ast: { type: "Program", children: statements }, errors };
}

/**
 * Stage 3: Semantic Analysis & Symbol Table Generation
 * Performs checks on identifier declarations, duplicate declarations, and undeclared reads.
 * Builds and updates the Symbol Table.
 */
function semanticAndSymbolTable(ast, syntaxErrors) {
  let errors = [];
  let symbolTable = new Map();

  // If there are lexical/syntax errors, abort semantic checking to prevent cascade failures
  if (syntaxErrors && syntaxErrors.length > 0) {
    return { symbolTable, errors };
  }

  // Helper: evaluate constant value recursively if expression consists of purely numbers and constants
  function evaluateConstExpr(node) {
    if (node.type === "Number") {
      return Number(node.value);
    }
    if (node.type === "Identifier") {
      let sym = symbolTable.get(node.name);
      if (sym && sym.value !== "Computed") {
        return sym.value;
      }
      return null;
    }
    if (node.type === "BinaryExpr") {
      let lVal = evaluateConstExpr(node.left);
      let rVal = evaluateConstExpr(node.right);
      if (lVal !== null && rVal !== null) {
        if (node.op === "+") return lVal + rVal;
        if (node.op === "-") return lVal - rVal;
        if (node.op === "*") return lVal * rVal;
        if (node.op === "/") return rVal !== 0 ? lVal / rVal : 0;
      }
      return null;
    }
    return null;
  }

  // Helper: check if all identifiers used in expression are declared
  function checkExprVariables(node, line) {
    if (node.type === "Identifier") {
      if (!symbolTable.has(node.name)) {
        errors.push({
          line: line,
          type: "Semantic Error",
          message: `Variable '${node.name}' not declared`,
          suggest: `Declare the variable '${node.name}' using 'SAMPAH ${node.name} = value' before using it.`
        });
      }
    } else if (node.type === "BinaryExpr") {
      checkExprVariables(node.left, line);
      checkExprVariables(node.right, line);
    }
  }

  function traverse(node) {
    if (node.type === "Declaration") {
      // Check for duplicate declaration
      if (symbolTable.has(node.name)) {
        errors.push({
          line: node.line,
          type: "Semantic Error",
          message: `Duplicate variable '${node.name}'`,
          suggest: `The variable '${node.name}' is already declared. Assign to it directly without using the 'SAMPAH' keyword.`
        });
      } else {
        checkExprVariables(node.value, node.line);
        let val = evaluateConstExpr(node.value);
        symbolTable.set(node.name, {
          name: node.name,
          type: "Number",
          value: val !== null ? val : "Computed",
          lineDeclared: node.line
        });
      }
    } else if (node.type === "Assignment") {
      checkExprVariables(node.value, node.line);
      let val = evaluateConstExpr(node.value);
      if (!symbolTable.has(node.name)) {
        // If not declared with SAMPAH, register it on first assignment (implicit declaration)
        symbolTable.set(node.name, {
          name: node.name,
          type: "Number",
          value: val !== null ? val : "Computed",
          lineDeclared: node.line
        });
      } else {
        // Update value of existing symbol
        let sym = symbolTable.get(node.name);
        sym.value = val !== null ? val : "Computed";
      }
    } else if (node.type === "Output") {
      checkExprVariables(node.value, node.line);
    }
  }

  if (ast.type === "Program") {
    ast.children.forEach(traverse);
  }

  return { symbolTable, errors };
}

/**
 * Stage 4: Intermediate Representation Generator
 * Traverses the AST to generate Three Address Code (TAC).
 */
function generateTAC(ast) {
  let instructions = [];
  let tempCount = 1;

  function nextTemp() {
    return `t${tempCount++}`;
  }

  function traverseExpr(node) {
    if (node.type === "Number") {
      return node.value;
    }
    if (node.type === "Identifier") {
      return node.name;
    }
    if (node.type === "BinaryExpr") {
      let left = traverseExpr(node.left);
      let right = traverseExpr(node.right);
      let t = nextTemp();
      instructions.push({
        type: "binary",
        dest: t,
        op: node.op,
        src1: left,
        src2: right,
        line: node.line
      });
      return t;
    }
  }

  function traverseStmt(node) {
    if (node.type === "Declaration") {
      let valStr = traverseExpr(node.value);
      instructions.push({
        type: "declare",
        dest: node.name,
        src1: valStr,
        line: node.line
      });
    } else if (node.type === "Assignment") {
      let valStr = traverseExpr(node.value);
      instructions.push({
        type: "assign",
        dest: node.name,
        src1: valStr,
        line: node.line
      });
    } else if (node.type === "Output") {
      let valStr = traverseExpr(node.value);
      instructions.push({
        type: "output",
        src: valStr,
        line: node.line
      });
    }
  }

  if (ast.type === "Program") {
    ast.children.forEach(traverseStmt);
  }

  return instructions;
}

/**
 * Stage 5: Code Optimization
 * Optimizes TAC using:
 * 1. Constant folding (e.g. 5 + 5 -> 10)
 * 2. Constant propagation (e.g. A = 10; B = A + 2 -> B = 10 + 2)
 * 3. Algebraic simplification (e.g. X + 0 -> X)
 * 4. Dead Code Elimination (e.g. removing unused assignments/variables)
 */
function optimizeTAC(instructions) {
  let optimized = JSON.parse(JSON.stringify(instructions));
  let changed = true;
  let iterations = 0;
  const maxIterations = 10;
  let warnings = [];

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Sub-pass 1: Constant Propagation, Folding & Algebraic Simplification
    let consts = {};
    for (let i = 0; i < optimized.length; i++) {
      let inst = optimized[i];
      if (!inst) continue;

      if (inst.type === "binary") {
        // Constant propagation
        if (consts[inst.src1] !== undefined) {
          inst.src1 = consts[inst.src1];
          changed = true;
        }
        if (consts[inst.src2] !== undefined) {
          inst.src2 = consts[inst.src2];
          changed = true;
        }

        // Constant folding
        let isNum1 = !isNaN(inst.src1);
        let isNum2 = !isNaN(inst.src2);
        if (isNum1 && isNum2) {
          let n1 = Number(inst.src1);
          let n2 = Number(inst.src2);
          let res = 0;
          if (inst.op === "+") res = n1 + n2;
          else if (inst.op === "-") res = n1 - n2;
          else if (inst.op === "*") res = n1 * n2;
          else if (inst.op === "/") res = n2 !== 0 ? n1 / n2 : 0;

          inst.type = "assign";
          inst.src1 = res.toString();
          delete inst.src2;
          delete inst.op;
          changed = true;
        } else {
          // Algebraic Simplification
          // x + 0 -> x
          if (inst.op === "+" && inst.src2 === "0") {
            inst.type = "assign";
            inst.src1 = inst.src1;
            delete inst.src2;
            delete inst.op;
            changed = true;
          } else if (inst.op === "+" && inst.src1 === "0") {
            inst.type = "assign";
            inst.src1 = inst.src2;
            delete inst.src2;
            delete inst.op;
            changed = true;
          }
          // x - 0 -> x
          else if (inst.op === "-" && inst.src2 === "0") {
            inst.type = "assign";
            inst.src1 = inst.src1;
            delete inst.src2;
            delete inst.op;
            changed = true;
          }
          // x * 1 -> x
          else if (inst.op === "*" && inst.src2 === "1") {
            inst.type = "assign";
            inst.src1 = inst.src1;
            delete inst.src2;
            delete inst.op;
            changed = true;
          } else if (inst.op === "*" && inst.src1 === "1") {
            inst.type = "assign";
            inst.src1 = inst.src2;
            delete inst.src2;
            delete inst.op;
            changed = true;
          }
          // x * 0 -> 0
          else if (inst.op === "*" && (inst.src1 === "0" || inst.src2 === "0")) {
            inst.type = "assign";
            inst.src1 = "0";
            delete inst.src2;
            delete inst.op;
            changed = true;
          }
          // x / 1 -> x
          else if (inst.op === "/" && inst.src2 === "1") {
            inst.type = "assign";
            inst.src1 = inst.src1;
            delete inst.src2;
            delete inst.op;
            changed = true;
          }
        }
      }

      if (inst.type === "assign" || inst.type === "declare") {
        // Constant propagation
        if (consts[inst.src1] !== undefined) {
          inst.src1 = consts[inst.src1];
          changed = true;
        }

        // Register constants
        if (!isNaN(inst.src1)) {
          consts[inst.dest] = inst.src1;
        } else {
          delete consts[inst.dest];
        }
      }

      if (inst.type === "output") {
        if (consts[inst.src] !== undefined) {
          inst.src = consts[inst.src];
          changed = true;
        }
      }
    }

    // Sub-pass 2: Dead Code Elimination (Live variable analysis backwards)
    let live = new Set();
    for (let i = optimized.length - 1; i >= 0; i--) {
      let inst = optimized[i];
      if (!inst) continue;

      if (inst.type === "output") {
        if (isNaN(inst.src)) live.add(inst.src);
      } else if (inst.type === "assign" || inst.type === "declare" || inst.type === "binary") {
        let isTemp = inst.dest.startsWith("t");
        if (!live.has(inst.dest)) {
          // If a user variable is eliminated, warn about dead code
          if (!isTemp) {
            warnings.push({
              line: inst.line,
              type: "Optimization Warning",
              message: `Variable '${inst.dest}' is declared/assigned but never used (Dead Code).`,
              suggest: `Remove the declaration or display the variable value with 'TAMPILKAN ${inst.dest}' to make it live.`
            });
          }
          optimized[i] = null; // Mark for deletion
          changed = true;
        } else {
          // Live variable processing
          live.delete(inst.dest);
          if (inst.src1 && isNaN(inst.src1)) live.add(inst.src1);
          if (inst.src2 && isNaN(inst.src2)) live.add(inst.src2);
          if (inst.src && isNaN(inst.src)) live.add(inst.src);
        }
      }
    }
    // Filter out deleted instructions
    optimized = optimized.filter((x) => x !== null);
  }

  // Deduplicate warnings
  let uniqueWarnings = [];
  let seenWarning = new Set();
  warnings.forEach((w) => {
    let key = `${w.line}-${w.message}`;
    if (!seenWarning.has(key)) {
      seenWarning.add(key);
      uniqueWarnings.push(w);
    }
  });

  return { optimized, warnings: uniqueWarnings };
}

/**
 * Stage 6: Target Code Generation
 * Translates the optimized TAC instructions to runnable Javascript code.
 */
function generateJSFromTAC(instructions) {
  let jsLines = [];
  let declaredInJS = new Set();

  instructions.forEach((inst) => {
    if (inst.type === "declare") {
      jsLines.push(`let ${inst.dest} = ${inst.src1};`);
      declaredInJS.add(inst.dest);
    } else if (inst.type === "assign" || inst.type === "binary") {
      let expr = inst.type === "assign" ? inst.src1 : `${inst.src1} ${inst.op} ${inst.src2}`;
      if (!declaredInJS.has(inst.dest)) {
        jsLines.push(`let ${inst.dest} = ${expr};`);
        declaredInJS.add(inst.dest);
      } else {
        jsLines.push(`${inst.dest} = ${expr};`);
      }
    } else if (inst.type === "output") {
      jsLines.push(`console.log(${inst.src});`);
    }
  });

  return jsLines.join("\n");
}

/**
 * Helper: Formatting AST into readable tree representation
 */
function renderAST(node, prefix = "", isLast = true) {
  let result = "";

  if (node.type === "Program") {
    result += "Program\n";
    let children = node.children || [];
    for (let i = 0; i < children.length; i++) {
      result += renderAST(children[i], "", i === children.length - 1);
    }
    return result;
  }

  let lineInfo = node.line ? ` (Line ${node.line})` : "";
  let connector = isLast ? "└── " : "├── ";
  let nextPrefix = prefix + (isLast ? "    " : "│   ");

  if (node.type === "Declaration") {
    result += prefix + connector + `Declaration${lineInfo}\n`;
    result += nextPrefix + "├── Identifier(" + node.name + ")\n";
    result += renderAST(node.value, nextPrefix, true);
  } else if (node.type === "Assignment") {
    result += prefix + connector + `Assignment${lineInfo}\n`;
    result += nextPrefix + "├── Identifier(" + node.name + ")\n";
    result += renderAST(node.value, nextPrefix, true);
  } else if (node.type === "Output") {
    result += prefix + connector + `Output${lineInfo}\n`;
    result += renderAST(node.value, nextPrefix, true);
  } else if (node.type === "BinaryExpr") {
    result += prefix + connector + `BinaryExpr(${node.op})${lineInfo}\n`;
    result += renderAST(node.left, nextPrefix, false);
    result += renderAST(node.right, nextPrefix, true);
  } else if (node.type === "Identifier") {
    result += prefix + connector + `Identifier(${node.name})\n`;
  } else if (node.type === "Number") {
    result += prefix + connector + `Number(${node.value})\n`;
  }

  return result;
}

/**
 * Helper: Count total AST Nodes
 */
function countASTNodes(node) {
  if (!node) return 0;
  let count = 1;
  if (node.type === "Program") {
    node.children.forEach((c) => {
      count += countASTNodes(c);
    });
  } else if (node.type === "Declaration" || node.type === "Assignment") {
    count += 1; // For identifier node child
    count += countASTNodes(node.value);
  } else if (node.type === "Output") {
    count += countASTNodes(node.value);
  } else if (node.type === "BinaryExpr") {
    count += countASTNodes(node.left);
    count += countASTNodes(node.right);
  }
  return count;
}

/**
 * Helper: Format TAC into string
 */
function formatTAC(instructions) {
  return instructions
    .map((inst) => {
      if (inst.type === "declare") {
        return `SAMPAH ${inst.dest} = ${inst.src1}`;
      }
      if (inst.type === "assign") {
        return `${inst.dest} = ${inst.src1}`;
      }
      if (inst.type === "binary") {
        return `${inst.dest} = ${inst.src1} ${inst.op} ${inst.src2}`;
      }
      if (inst.type === "output") {
        return `TAMPILKAN ${inst.src}`;
      }
      return "";
    })
    .join("\n");
}

/**
 * Dashboard & Pipeline UI management
 */
function updateStageUI(stageId, state, text) {
  const stage = document.getElementById(`stage-${stageId}`);
  if (!stage) return;
  const indicator = stage.querySelector(".indicator");
  const statusSpan = stage.querySelector(".stage-status");

  indicator.className = "indicator";
  stage.className = "stage";

  if (state === "waiting") {
    indicator.classList.add("waiting");
    stage.classList.add("state-waiting");
    statusSpan.textContent = text || "Waiting";
  } else if (state === "running") {
    indicator.classList.add("running");
    stage.classList.add("state-running");
    statusSpan.textContent = text || "Running";
  } else if (state === "success") {
    indicator.classList.add("success");
    stage.classList.add("state-success");
    statusSpan.textContent = text || "Success";
  } else if (state === "error") {
    indicator.classList.add("error");
    stage.classList.add("state-error");
    statusSpan.textContent = text || "Error";
  }
}

// Global cached report data
let globalCompilationCache = {
  source: "",
  tokens: [],
  symbolTable: new Map(),
  astStr: "",
  originalTAC: [],
  optimizedTAC: [],
  generatedJS: "",
  errors: [],
  warnings: []
};

/**
 * Main Compilation Execution Pipeline
 */
async function compileEco() {
  const code = document.getElementById("editor").value;
  const systemStatus = document.getElementById("system-status");

  // Reset UI fields
  systemStatus.textContent = "● Compiling...";
  systemStatus.style.color = "var(--yellow)";
  document.getElementById("sidebar-errors-link").style.display = "none";
  document.getElementById("errors-section").style.display = "none";
  document.getElementById("errorList").innerHTML = "";

  const stages = ["lexical", "syntax", "semantic", "symbol", "ast", "ir", "optimization", "codegen"];
  stages.forEach((s) => updateStageUI(s, "waiting"));

  // Store in cache
  globalCompilationCache.source = code;
  globalCompilationCache.errors = [];
  globalCompilationCache.warnings = [];

  // ==========================================
  // STAGE 1: Lexical Analysis
  // ==========================================
  updateStageUI("lexical", "running");
  await sleep(120);

  const lexResult = lexical(code);
  const tokens = lexResult.tokens;
  const lexErrors = lexResult.errors;

  // Render tokens
  let tokenHtml = `<table><thead><tr><th>Position</th><th>Lexeme</th><th>Type</th></tr></thead><tbody>`;
  if (tokens.length === 0) {
    tokenHtml += `<tr><td colspan="3" class="text-center">No tokens generated.</td></tr>`;
  } else {
    tokens.forEach((t) => {
      tokenHtml += `<tr><td>Line ${t.line}, Col ${t.col}</td><td><code>${t.value}</code></td><td>${t.type}</td></tr>`;
    });
  }
  tokenHtml += `</tbody></table>`;
  document.getElementById("tokens").innerHTML = tokenHtml;

  if (lexErrors.length > 0) {
    updateStageUI("lexical", "error");
    displayDiagnostics(lexErrors, []);
    systemStatus.textContent = "● Compilation Failed";
    systemStatus.style.color = "var(--red)";
    updateDashboardStats(tokens, new Map(), lexErrors, [], null, "", [], []);
    return;
  }
  updateStageUI("lexical", "success");

  // ==========================================
  // STAGE 2: Syntax Analysis
  // ==========================================
  updateStageUI("syntax", "running");
  await sleep(120);

  const parseResult = parse(tokens);
  const ast = parseResult.ast;
  const syntaxErrors = parseResult.errors;

  if (syntaxErrors.length > 0) {
    updateStageUI("syntax", "error");
    displayDiagnostics(syntaxErrors, []);
    systemStatus.textContent = "● Compilation Failed";
    systemStatus.style.color = "var(--red)";
    updateDashboardStats(tokens, new Map(), syntaxErrors, [], null, "", [], []);
    return;
  }
  updateStageUI("syntax", "success");

  // ==========================================
  // STAGE 3: Semantic Analysis & Symbol Table
  // ==========================================
  updateStageUI("semantic", "running");
  await sleep(120);

  const semResult = semanticAndSymbolTable(ast, syntaxErrors);
  const symbolTable = semResult.symbolTable;
  const semanticErrors = semResult.errors;

  if (semanticErrors.length > 0) {
    updateStageUI("semantic", "error");
    displayDiagnostics(semanticErrors, []);
    systemStatus.textContent = "● Compilation Failed";
    systemStatus.style.color = "var(--red)";
    updateDashboardStats(tokens, symbolTable, semanticErrors, [], null, "", [], []);
    return;
  }
  updateStageUI("semantic", "success");

  // ==========================================
  // STAGE 4: Symbol Table Display
  // ==========================================
  updateStageUI("symbol", "running");
  await sleep(100);

  let symHtml = ``;
  if (symbolTable.size === 0) {
    symHtml += `<tr><td colspan="4" class="text-center">No variables declared.</td></tr>`;
  } else {
    symbolTable.forEach((s) => {
      symHtml += `<tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.type}</td>
        <td><code>${s.value}</code></td>
        <td>${s.lineDeclared}</td>
      </tr>`;
    });
  }
  document.querySelector("#symbolTable tbody").innerHTML = symHtml;
  updateStageUI("symbol", "success");

  // ==========================================
  // STAGE 5: AST Representation Display
  // ==========================================
  updateStageUI("ast", "running");
  await sleep(100);

  const astStr = renderAST(ast);
  document.getElementById("tree").textContent = astStr;
  updateStageUI("ast", "success");

  // ==========================================
  // STAGE 6: Intermediate Code (TAC)
  // ==========================================
  updateStageUI("ir", "running");
  await sleep(100);

  const originalTAC = generateTAC(ast);
  const rawTacText = formatTAC(originalTAC);
  document.getElementById("tacCode").textContent = rawTacText;
  document.getElementById("optOriginal").textContent = rawTacText;
  updateStageUI("ir", "success");

  // ==========================================
  // STAGE 7: Code Optimization
  // ==========================================
  updateStageUI("optimization", "running");
  await sleep(100);

  const optResult = optimizeTAC(originalTAC);
  const optimizedTAC = optResult.optimized;
  const optWarnings = optResult.warnings;

  document.getElementById("optOptimized").textContent = formatTAC(optimizedTAC);
  updateStageUI("optimization", "success");

  // ==========================================
  // STAGE 8: Target Code Generation
  // ==========================================
  updateStageUI("codegen", "running");
  await sleep(120);

  const generatedJS = generateJSFromTAC(optimizedTAC);
  document.getElementById("generated").textContent = generatedJS;
  updateStageUI("codegen", "success");

  // Display compilation summary
  systemStatus.textContent = "● Ready";
  systemStatus.style.color = "var(--accent)";

  // Render warnings if any
  if (optWarnings.length > 0) {
    displayDiagnostics([], optWarnings);
  }

  // Update statistics dashboard
  updateDashboardStats(tokens, symbolTable, [], optWarnings, ast, generatedJS, originalTAC, optimizedTAC);

  // Cache elements for download
  globalCompilationCache.tokens = tokens;
  globalCompilationCache.symbolTable = symbolTable;
  globalCompilationCache.astStr = astStr;
  globalCompilationCache.originalTAC = originalTAC;
  globalCompilationCache.optimizedTAC = optimizedTAC;
  globalCompilationCache.generatedJS = generatedJS;
  globalCompilationCache.warnings = optWarnings;
}

/**
 * Renders errors and warnings to Diagnostic Log Section
 */
function displayDiagnostics(errors, warnings) {
  const logSection = document.getElementById("errors-section");
  const logContainer = document.getElementById("errorList");
  const sidebarErrors = document.getElementById("sidebar-errors-link");

  logSection.style.display = "block";
  sidebarErrors.style.display = "block";

  let listHtml = "";

  errors.forEach((e) => {
    listHtml += `
      <div class="error-item error">
        <div class="error-header">
          <span class="error-title">❌ ${e.type}</span>
          <span class="line-no">Line ${e.line}</span>
        </div>
        <div class="error-msg">${e.message}</div>
        <div class="error-suggest"><strong>Suggested Fix:</strong> ${e.suggest}</div>
      </div>
    `;
  });

  warnings.forEach((w) => {
    listHtml += `
      <div class="error-item warning">
        <div class="error-header">
          <span class="error-title">⚠️ ${w.type}</span>
          <span class="line-no">Line ${w.line}</span>
        </div>
        <div class="error-msg">${w.message}</div>
        <div class="error-suggest"><strong>Suggested Fix:</strong> ${w.suggest}</div>
      </div>
    `;
  });

  logContainer.innerHTML = listHtml;
}

/**
 * Updates Statistics Dashboard elements
 */
function updateDashboardStats(tokens, symbolTable, errors, warnings, ast, generatedCode, originalTAC, optimizedTAC) {
  document.getElementById("tokenCount").textContent = tokens.length;

  let identifiers = tokens.filter((t) => t.type === "Identifier").length;
  let keywords = tokens.filter((t) => t.type === "Keyword").length;
  let operators = tokens.filter((t) => t.type === "Operator").length;
  let numbers = tokens.filter((t) => t.type === "Number").length;

  document.getElementById("identifierCount").textContent = identifiers;
  document.getElementById("keywordCount").textContent = keywords;
  document.getElementById("operatorCount").textContent = operators;
  document.getElementById("numberCount").textContent = numbers;

  document.getElementById("varCount").textContent = symbolTable.size;
  document.getElementById("errorCount").textContent = errors.length;
  document.getElementById("warningCount").textContent = warnings.length;

  let astNodes = ast ? countASTNodes(ast) : 0;
  document.getElementById("astCount").textContent = astNodes;

  let genLines = generatedCode ? generatedCode.split("\n").filter((l) => l.trim().length > 0).length : 0;
  document.getElementById("lineCount").textContent = genLines;

  let origCount = originalTAC.length;
  let optCount = optimizedTAC.length;
  let savings = origCount > 0 ? Math.round(((origCount - optCount) / origCount) * 100) : 0;
  document.getElementById("savingsCount").textContent = savings + "%";
}

/**
 * Button controller: Reset editor input
 */
function resetEditor() {
  document.getElementById("editor").value = "";
  compileEco();
}

/**
 * Button controller: Loads default sample
 */
function loadSample() {
  document.getElementById("editor").value = sample;
  compileEco();
}

/**
 * Button controller: Loads preset test cases
 */
function loadTestCase(key) {
  if (testCases[key]) {
    document.getElementById("editor").value = testCases[key];
    compileEco();
  }
}

/**
 * Button controller: Export generated JavaScript code as file
 */
function exportJS() {
  const jsContent = document.getElementById("generated").textContent;
  if (!jsContent.trim()) {
    alert("No generated JavaScript code available to export.");
    return;
  }
  const blob = new Blob([jsContent], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "generated.js";
  a.click();
}

/**
 * Button controller: Export reports in TXT or HTML
 */
function downloadReport(format) {
  const cache = globalCompilationCache;
  const stats = {
    "Total Tokens": document.getElementById("tokenCount").textContent,
    "Identifiers": document.getElementById("identifierCount").textContent,
    "Keywords": document.getElementById("keywordCount").textContent,
    "Operators": document.getElementById("operatorCount").textContent,
    "Numbers": document.getElementById("numberCount").textContent,
    "Variables": document.getElementById("varCount").textContent,
    "Errors": document.getElementById("errorCount").textContent,
    "Warnings": document.getElementById("warningCount").textContent,
    "AST Nodes": document.getElementById("astCount").textContent,
    "Generated JS Lines": document.getElementById("lineCount").textContent,
    "Optimization Savings": document.getElementById("savingsCount").textContent
  };

  // Compile diagnostics array
  let diagnostics = [];
  const errorItems = document.querySelectorAll(".error-item");
  errorItems.forEach((item) => {
    let isWarning = item.classList.contains("warning");
    let title = item.querySelector(".error-title").textContent;
    let lineText = item.querySelector(".line-no").textContent;
    let line = parseInt(lineText.replace("Line ", ""));
    let message = item.querySelector(".error-msg").textContent;
    let suggest = item.querySelector(".error-suggest").textContent.replace("Suggested Fix: ", "");

    diagnostics.push({
      type: isWarning ? "Optimization Warning" : title.replace("❌ ", ""),
      line: line,
      message: message,
      suggest: suggest
    });
  });

  let fileContent = "";
  let fileName = "";
  let mimeType = "";

  if (format === "txt") {
    fileName = "ecolang_compile_report.txt";
    mimeType = "text/plain";

    fileContent += "====================================================\n";
    fileContent += "           ECOLANG COMPILER STUDIO REPORT           \n";
    fileContent += "====================================================\n\n";

    fileContent += "--- SOURCE CODE ---\n";
    fileContent += cache.source + "\n\n";

    fileContent += "--- COMPILER STATISTICS ---\n";
    Object.keys(stats).forEach((k) => {
      fileContent += `${k}: ${stats[k]}\n`;
    });
    fileContent += "\n";

    if (diagnostics.length > 0) {
      fileContent += "--- DIAGNOSTIC LOG & ERRORS ---\n";
      diagnostics.forEach((d) => {
        fileContent += `[${d.type}] Line ${d.line}: ${d.message}\n`;
        fileContent += `  Suggestion: ${d.suggest}\n`;
      });
      fileContent += "\n";
    }

    fileContent += "--- TOKENS ---\n";
    cache.tokens.forEach((t) => {
      fileContent += `Line ${t.line}, Col ${t.col}: ${t.value} (${t.type})\n`;
    });
    fileContent += "\n";

    fileContent += "--- SYMBOL TABLE ---\n";
    if (cache.symbolTable.size === 0) {
      fileContent += "No variables declared.\n";
    } else {
      cache.symbolTable.forEach((s) => {
        fileContent += `${s.name} | ${s.type} | ${s.value} | Line ${s.lineDeclared}\n`;
      });
    }
    fileContent += "\n";

    fileContent += "--- ABSTRACT SYNTAX TREE ---\n";
    fileContent += cache.astStr + "\n\n";

    fileContent += "--- ORIGINAL THREE ADDRESS CODE (TAC) ---\n";
    fileContent += formatTAC(cache.originalTAC) + "\n\n";

    fileContent += "--- OPTIMIZED THREE ADDRESS CODE (TAC) ---\n";
    fileContent += formatTAC(cache.optimizedTAC) + "\n\n";

    fileContent += "--- TARGET GENERATED JS ---\n";
    fileContent += cache.generatedJS + "\n";
  } else if (format === "html") {
    fileName = "ecolang_compile_report.html";
    mimeType = "text/html";

    fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>EcoLang Compiler Studio - Report</title>
  <style>
    body { font-family: sans-serif; background: #0b1220; color: #e5e7eb; padding: 30px; line-height: 1.6; }
    h1 { color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #fff; margin-top: 35px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    pre { background: #060b13; padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-family: monospace; overflow-x: auto; white-space: pre-wrap; color: #f1f5f9; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
    th { background: rgba(255,255,255,0.05); color: #fff; }
    .error-item { border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05); padding: 12px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
    .warning-item { border-left: 4px solid #f97316; background: rgba(249, 115, 22, 0.05); padding: 12px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
    .suggest { font-size: 0.9em; color: #9ca3af; margin-top: 5px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-top: 15px; }
    .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 15px; border-radius: 8px; text-align: center; }
    .stat-card span { font-size: 1.5em; font-weight: bold; color: #4ade80; display: block; }
    .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) {
      .opt-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <h1>EcoLang Compiler Studio - Compilation Report</h1>
  <p>Generated on: <strong>${new Date().toLocaleString()}</strong></p>

  <h2>1. Source Code</h2>
  <pre>${escapeHTML(cache.source)}</pre>

  <h2>2. Compiler Statistics</h2>
  <div class="stats-grid">
    ${Object.keys(stats)
      .map(
        (k) => `
      <div class="stat-card">
        <span>${stats[k]}</span>
        <small>${k}</small>
      </div>
    `
      )
      .join("")}
  </div>

  ${
    diagnostics.length > 0
      ? `
    <h2>3. Diagnostic Logs (Errors & Warnings)</h2>
    <div>
      ${diagnostics
        .map(
          (d) => `
        <div class="${d.type.includes("Warning") ? "warning-item" : "error-item"}">
          <strong>[${d.type}] Line ${d.line}</strong>: ${escapeHTML(d.message)}
          <div class="suggest"><strong>Suggestion:</strong> ${escapeHTML(d.suggest)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
      : ""
  }

  <h2>4. Lexical Analysis: Tokens</h2>
  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Lexeme</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      ${cache.tokens
        .map(
          (t) => `
        <tr>
          <td>Line ${t.line}, Col ${t.col}</td>
          <td><code>${escapeHTML(t.value)}</code></td>
          <td>${t.type}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <h2>5. Symbol Table</h2>
  <table>
    <thead>
      <tr>
        <th>Identifier</th>
        <th>Type</th>
        <th>Value</th>
        <th>Line Declared</th>
      </tr>
    </thead>
    <tbody>
      ${
        cache.symbolTable.size === 0
          ? `<tr><td colspan="4" style="text-align: center;">No variables declared.</td></tr>`
          : Array.from(cache.symbolTable.values())
              .map(
                (s) => `
        <tr>
          <td><strong>${escapeHTML(s.name)}</strong></td>
          <td>${s.type}</td>
          <td><code>${escapeHTML(s.value.toString())}</code></td>
          <td>${s.lineDeclared}</td>
        </tr>
      `
              )
              .join("")
      }
    </tbody>
  </table>

  <h2>6. Abstract Syntax Tree (AST)</h2>
  <pre>${escapeHTML(cache.astStr)}</pre>

  <h2>7. Intermediate Representation & Optimization</h2>
  <div class="opt-grid">
    <div>
      <h3>Original TAC</h3>
      <pre>${escapeHTML(formatTAC(cache.originalTAC))}</pre>
    </div>
    <div>
      <h3>Optimized TAC</h3>
      <pre>${escapeHTML(formatTAC(cache.optimizedTAC))}</pre>
    </div>
  </div>

  <h2>8. Target Code Generation: JavaScript</h2>
  <pre>${escapeHTML(cache.generatedJS)}</pre>
</body>
</html>`;
  }

  const blob = new Blob([fileContent], { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
