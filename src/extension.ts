// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import player, { PlayerConfig } from './player';
import debounce = require('lodash.debounce');
import { toInteger } from 'lodash';
import { Transform } from 'stream';

let listener: EditorListener;
let isActive: boolean;
let isNotArrowKey: boolean;
let config: PlayerConfig = {
    macVol: 1,
    winVol: 100,
    linuxVol: 100
};
let start: number;
let mpv = require('node-mpv');
let mpvPlayer = new mpv();
let music_started = false;

const stat_period_duration = 5 * 1000;
const weighted_coef = 0.4;

//The variable below will just make it so the user cannot run the setInterval method more than once at a time
var isSetTimmeoutRunning = false;
//TODO
var interval = setInterval(function(){}, 1000);

function startBackground(){
  //We set this variable to true when we first run the setInterval method.
  //It will get set back to false when the user clicks the stop button
  isSetTimmeoutRunning = true;
  interval = setInterval(function(){
    listener.adjust_speed();
  }, 1000);
}

//Our function to clear the setInterval() method above
function stopBackground(){
  clearInterval(interval);
  isSetTimmeoutRunning = false;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Initializing "hacker-sounds" extension');

    // is the extension activated? yes by default.
    isActive = context.globalState.get('hacker_sounds', true);
    config.macVol = context.globalState.get('mac_volume', 1);
    config.winVol = context.globalState.get('win_volume', 100);
    config.linuxVol = context.globalState.get('linux_volume', 1);

    // to avoid multiple different instances
    listener = listener || new EditorListener(player);

    vscode.commands.registerCommand('hacker_sounds.enable', () => {
        if (!isActive) {
            context.globalState.update('hacker_sounds', true);
            isActive = true;
            vscode.window.showInformationMessage('Hacker Sounds extension enabled');
        } else {
            vscode.window.showWarningMessage('Hacker Sounds extension is already enabled');
        }
    });
    vscode.commands.registerCommand('hacker_sounds.disable', () => {
        if (isActive) {
            context.globalState.update('hacker_sounds', false);
            isActive = false;
            stopBackground();
            vscode.window.showInformationMessage('Hacker Sounds extension disabled');
        } else {
            vscode.window.showWarningMessage('Hacker Sounds extension is already disabled');
        }
    });

    vscode.commands.registerCommand('hacker_sounds.run', async () => {
        if (isActive) {
            music_started = true;
            let input = await vscode.window.showInputBox();
            mpvPlayer.loadStream(input);
            start = Date.now();  
            startBackground();
            vscode.window.showWarningMessage('Music is started');
            console.log("music is started");
        }
    });

    vscode.commands.registerCommand('hacker_sounds.stop', () => {
        if (isActive) {
            music_started = false;
            mpvPlayer.stop();
            vscode.window.showWarningMessage('Music is stoped');
        }
    });

    vscode.commands.registerCommand('hacker_sounds.volumeUp', () => {
        let newVol = null;
        switch (process.platform) {
            case 'darwin':
                config.macVol += 1;

                if (config.macVol > 10) {
                    vscode.window.showWarningMessage('Hacker Sounds already at maximum volume');
                    config.macVol = 10;
                }

                newVol = config.macVol;
                context.globalState.update('mac_volume', newVol);
                break;

            case 'win32':
                config.winVol += 10;

                if (config.winVol > 100) {
                    vscode.window.showWarningMessage('Hacker Sounds already at maximum volume');
                    config.winVol = 100;
                }

                newVol = config.winVol;
                context.globalState.update('win_volume', newVol);
                break;

            case 'linux':
                config.linuxVol += 1;

                if (config.linuxVol > 10) {
                    vscode.window.showWarningMessage('Hacker Sounds already at maximum volume');
                    config.linuxVol = 10;
                }

                newVol = config.linuxVol;
                context.globalState.update('linux_volume', newVol);
                break;

            default:
                newVol = 0;
                break;
        }

        vscode.window.showInformationMessage('Hacker Sounds volume raised: ' + newVol);
    });
    vscode.commands.registerCommand('hacker_sounds.volumeDown', () => {
        let newVol = null;

        switch (process.platform) {
            case 'darwin':
                config.macVol -= 1;

                if (config.macVol < 1) {
                    vscode.window.showWarningMessage('Hacker Sounds already at minimum volume');
                    config.macVol = 1;
                }

                newVol = config.macVol;
                context.globalState.update('mac_volume', newVol);
                break;

            case 'win32':
                config.winVol -= 10;

                if (config.winVol < 10) {
                    vscode.window.showWarningMessage('Hacker Sounds already at minimum volume');
                    config.winVol = 10;
                }

                newVol = config.winVol;
                context.globalState.update('win_volume', newVol);
                break;

            case 'linux':
                config.linuxVol -= 1;

                if (config.linuxVol < 1) {
                    vscode.window.showWarningMessage('Hacker Sounds already at minimum volume');
                    config.linuxVol = 1;
                }

                newVol = config.linuxVol;
                context.globalState.update('linux_volume', newVol);
                break;

            default:
                newVol = 0;
                break;
        }

        vscode.window.showInformationMessage('Hacker Sounds volume lowered: ' + newVol);
    });

    vscode.commands.registerCommand('hacker_sounds.setVolume', async () => {
        let input = await vscode.window.showInputBox()
        let newVol = toInteger(input);

        switch (process.platform) {
            case 'darwin':
                if (newVol > 10) {
                    vscode.window.showInformationMessage("Volume increased to maximum")
                    config.macVol = 10;
                } else if (newVol < 1) {
                    vscode.window.showInformationMessage("Volume decreased to minimum")
                    config.macVol = 1
                } else {
                    if (config.macVol < newVol)
                        vscode.window.showInformationMessage("Volume increased to " + newVol)
                    else if (config.macVol > newVol)
                        vscode.window.showInformationMessage("Volume decreased to " + newVol)
                    else
                        vscode.window.showWarningMessage("Volume already at " + newVol);

                    config.macVol = newVol;
                }

                context.globalState.update('mac_volume', newVol);
                break;

            case 'win32':
                if (newVol > 100) {
                    vscode.window.showInformationMessage("Volume increased to maximum")
                    config.winVol = 100;
                }
                else if (newVol < 10) {
                    vscode.window.showInformationMessage("Volume decreased to minimum")
                    config.winVol = 10
                } else {
                    if (config.winVol < newVol)
                        vscode.window.showInformationMessage("Volume increased to " + newVol)
                    else if (config.winVol > newVol)
                        vscode.window.showInformationMessage("Volume decreased to " + newVol)
                    else
                        vscode.window.showWarningMessage("Volume already at " + newVol);

                    config.winVol = newVol;
                }

                context.globalState.update('win_volume', newVol);
                break;

            case 'linux':
                if (newVol > 10) {
                    vscode.window.showInformationMessage("Volume increased to maximum")
                    config.linuxVol = 10;
                } else if (newVol < 1) {
                    vscode.window.showInformationMessage("Volume decreased to minimum")
                    config.linuxVol = 1
                } else {
                    if (config.linuxVol < newVol)
                        vscode.window.showInformationMessage("Volume increased to " + newVol)
                    else if (config.linuxVol > newVol)
                        vscode.window.showInformationMessage("Volume decreased to " + newVol)
                    else
                        vscode.window.showWarningMessage("Volume already at " + newVol);

                    config.linuxVol = newVol;
                }

                context.globalState.update('linux_volume', newVol);
                break;

            default:
                newVol = 0;
                break;
        }
    });


    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(listener);
}

// this method is called when your extension is deactivated
export function deactivate() { }

/**
 * Listen to editor changes and play a sound when a key is pressed.
 */
export class EditorListener {
    private _current_temp = 0;
    private _current_period = 0;
    private _music_started = false;

    private _disposable: vscode.Disposable;
    private _subscriptions: vscode.Disposable[] = [];
    private _basePath: string = path.join(__dirname, '..');
    private _average_temp = 20;

    constructor(private player: any) {
        isNotArrowKey = false;

        vscode.workspace.onDidChangeTextDocument(this._keystrokeCallback, this, this._subscriptions);
        vscode.window.onDidChangeTextEditorSelection(this._arrowKeysCallback, this, this._subscriptions);
        this._disposable = vscode.Disposable.from(...this._subscriptions);
        this.player = {
            play: (filePath: string) => player.play(filePath, config)
        };
    }

    map_temp_to_interval(temp: number) {
        if (temp < 10) {
            return 0.75
        } else if (temp < 20) {
            return 1;
        } else if (temp < 25) {
            return 1.25;
        } else {
            return 1.5;
        }
    }

    adjust_speed() {
        // Check of starting new stat period
        let new_period = Math.round((Date.now() - start) / stat_period_duration);

        if (new_period != this._current_period) {
            let scale = this.map_temp_to_interval(this._average_temp);
            console.log("Temp " + this._average_temp);
            console.log("Temp cur " + this._current_temp);
            console.log("Scale" + scale);
            console.log("    ");
            mpvPlayer.speed(scale);
            this._current_period = new_period;
            this._average_temp = Math.round(weighted_coef * this._average_temp + (1 - weighted_coef) * this._current_temp);
            this._current_temp = 0; 
        } else {
            this._current_temp = this._current_temp + 1;
        }
    }

    _keystrokeCallback = debounce((event: vscode.TextDocumentChangeEvent) => {
        if (!isActive) { return; }
        let activeDocument = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document;
        if (event.document !== activeDocument || event.contentChanges.length === 0) { return; }
        this.adjust_speed();
    }, 100, { leading: true });

    _arrowKeysCallback = debounce((event: vscode.TextEditorSelectionChangeEvent) => {
        if (!isActive) { return; }
        // current editor
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.textEditor.document) { return; }
        this.adjust_speed();
    }, 100, { leading: true });

    dispose() {
        this._disposable.dispose();
        mpvPlayer.stop();
    }
}
