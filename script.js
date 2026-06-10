const sample = `SAMPAH botol = 100
SAMPAH kardus = 50

TOTAL = botol + kardus

TAMPILKAN TOTAL`;

document.getElementById("editor").value = sample;

function lexical(code) {
  const regex = /SAMPAH|TAMPILKAN|[A-Za-z_][A-Za-z0-9_]*|\d+|[=+*/]/g;
  let out = [];
  let m;
  while ((m = regex.exec(code)) !== null) {
    let v = m[0],
      t = "Identifier";
    if (["SAMPAH", "TAMPILKAN"].includes(v)) t = "Keyword";
    else if (/^\d+$/.test(v)) t = "Number";
    else if (/[=+*/]/.test(v)) t = "Operator";
    out.push({ lexeme: v, type: t });
  }
  return out;
}

function syntaxAndSemantic(lines) {
  let vars = new Set(),
    errors = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i].trim();
    if (!l) continue;

    if (l.startsWith("SAMPAH")) {
      let m = l.match(/^SAMPAH\s+([A-Za-z_]\w*)\s*=\s*(\d+)$/);
      if (!m) {
        errors.push(`Line ${i + 1}: Invalid declaration`);
        continue;
      }
      if (vars.has(m[1])) errors.push(`Line ${i + 1}: Duplicate variable ${m[1]}`);
      vars.add(m[1]);
    } else if (l.startsWith("TAMPILKAN")) {
      let m = l.match(/^TAMPILKAN\s+([A-Za-z_]\w*)$/);
      if (!m) errors.push(`Line ${i + 1}: Invalid output statement`);
    } else {
      let m = l.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*|\d+)\s*\+\s*([A-Za-z_]\w*|\d+)$/);
      if (!m) {
        errors.push(`Line ${i + 1}: Invalid assignment`);
        continue;
      }
      [m[2], m[3]].forEach((v) => {
        if (isNaN(v) && !vars.has(v)) errors.push(`Line ${i + 1}: Variable ${v} not declared`);
      });
    }
  }
  return { errors, vars };
}

function parseTree(lines) {
  let tree = "Program\n";
  lines.forEach((l) => {
    l = l.trim();
    if (!l) return;
    if (l.startsWith("SAMPAH")) tree += "├── Declaration\n";
    else if (l.startsWith("TAMPILKAN")) tree += "├── Output\n";
    else tree += "├── Assignment\n";
  });
  return tree;
}

function generateJS(lines) {
  let out = [];
  for (let l of lines) {
    l = l.trim();
    if (!l) continue;
    if (l.startsWith("SAMPAH")) {
      let p = l.split(/\s+/);
      out.push(`let ${p[1]} = ${p[3]};`);
    } else if (l.startsWith("TAMPILKAN")) {
      out.push(`console.log(${l.split(/\s+/)[1]});`);
    } else {
      out.push(l + ";");
    }
  }
  return out.join("\n");
}

function compileEco() {
  let code = editor.value;
  let lines = code.split("\n");

  document.getElementById("tokens").innerHTML =
    "<table><tr><th>Lexeme</th><th>Type</th></tr>" +
    lexical(code)
      .map((x) => `<tr><td>${x.lexeme}</td><td>${x.type}</td></tr>`)
      .join("") +
    "</table>";

  let result = syntaxAndSemantic(lines);

  document.getElementById("syntax").innerHTML = result.errors.length ? result.errors.join("<br>") : "<b>No errors detected</b>";

  document.getElementById("tree").textContent = parseTree(lines);

  let generated = generateJS(lines);
  document.getElementById("generated").textContent = generated;

  tokenCount.textContent = lexical(code).length;
  varCount.textContent = result.vars.size;
  errorCount.textContent = result.errors.length;
  lineCount.textContent = generated.split("\n").length;
}

function resetEditor() {
  editor.value = "";
}
function loadSample() {
  editor.value = sample;
}

function exportJS() {
  const blob = new Blob([generated.textContent], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "generated.js";
  a.click();
}

function downloadReport() {
  const report = `EcoLang Report\n\nTokens:${tokenCount.textContent}\nVariables:${varCount.textContent}\nErrors:${errorCount.textContent}`;
  const blob = new Blob([report], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "report.txt";
  a.click();
}

compileEco();
