import * as vscode from "vscode";
import { TerminalCommand } from "./command";
import * as path from "path";
let previousTerminal: vscode.Terminal | undefined;

export async function runCommand(
  command: TerminalCommand,
  cwd?: string,
  resource?: string,
) {
  // 资源完整路径
  let resourceFullPath = "";
  if (cwd && resource) {
    resourceFullPath = path.join(cwd, resource);
  }

  // vscode 打开的工作区
  let workPath = "";
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    workPath = workspaceFolders[0].uri.fsPath;
  }

  const result = await insertVariables(command.command, resourceFullPath);

  const task = new vscode.Task(
    { type: "shell" }, // 任务类型
    vscode.TaskScope.Workspace, // 作用域
    result.command.split(" ")[0], // 任务名称
    "my-run-terminal-command", // 源名称
    new vscode.ShellExecution(result.command, {
      cwd: workPath, // 执行命令,并设置工作目录 (重要)(起到了切换目录的作用)
    }),
  );

  // 配置终端行为（关键：重用同一面板）
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always, // 始终显示终端
    panel: vscode.TaskPanelKind.Shared, // 共享终端面板
    clear: false, // 不清空历史
  };
  // 执行任务
  vscode.tasks.executeTask(task);
}

function ensureDisposed() {
  if (previousTerminal) {
    previousTerminal.dispose();
    previousTerminal = undefined;
  }
}

async function insertVariables(command: string, resource?: string) {
  const resourceResult = insertVariable(command, "resource", resource);
  const clipboardResult = insertVariable(
    resourceResult.command,
    "clipboard",
    await vscode.env.clipboard.readText(),
  );

  return {
    command: clipboardResult.command,
    successful: resourceResult.successful && clipboardResult.successful,
  };
}

function insertVariable(command: string, variable: string, value?: string) {
  let successful = true;
  const pattern = `{${variable}}`;

  if (new RegExp(pattern, "i").test(command)) {
    command = command.replace(new RegExp(pattern, "ig"), value || "");

    if (!value) {
      successful = false;
    }
  }

  return {
    command,
    successful,
  };
}
