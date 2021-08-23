# Discord-TTS-Bot-VOICEVOX
Discord.jsで作成したDiscordの読み上げBOTです。
<br>
音声エンジンに[VOICEVOX](https://voicevox.hiroshiba.jp/)を使っています。
<br>
適当にセルフホストして自由に利用してください。
<br>
Windows10 Pro上で作ったので、Windows10 Proしか動作保証しません。

## 環境構築手順

### node.jsの準備

Node.js v16.6.2以降をダウンロードして、インストールしてください。


### Bot実行の準備

Node.jsで使うパッケージを準備  
```
npm install
```  
※package.jsonがあるディレクトリで実行して下さい。

### VOICEVOXの準備

[VOICEVOX](https://voicevox.hiroshiba.jp/)のダウンロードボタンからVOICEVOXをダウンロードしてください。
<br>
ダウンロードしたら任意の場所フォルダに解凍してください。

### Botトークンの取得とenv設定

BotトークンをDiscord Developer Portalから取得してください。ここでは取得方法は省略します。
<br>
.env_sampleを.envにリネームして、中身を下記のように修正してください。
```
# Environment Config
PREFIX=!
DISCORD_BOT_TOKEN=ここにBOTトークンを記入
VOICE_TEXT_CHANNEL_ID=ここに読み上げしたいテキストチャンネルのIDを記入
VOICEVOX_ENGINE=http://localhost:50021
```  

### VOICEVOXの起動

VOICEVOXのフォルダ内のVOICEVOX.exeを起動してください。
<br>
GPU搭載PCの人は、起動モード「GPU」で起動した方が読み上げレスポンスが早です。

### BOTの起動

bot.jsがあるフォルダに移動して、コマンドプロンプトで下記を入力して下さい。
```
node bot.js
``` 
※必ずVOICEVOXが起動している状態で実行して下さい。


### BOTコマンド

| コマンド             | 説明                                                                                           |
|---------------------|------------------------------------------------------------------------------------------------|
| !vvjoin             | 自分がボイスチャンネル入っている状態で入力すると、BOTがボイスチャンネルに入室します。                  |
| !vvbye              | BOTがボイスチャンネルから退出します。                                                              |
| !readoff            | BOTの読み上げをOFFにします。 ※他の読み上げBOTが入っている時に、読み上げが被らないようにする時などに利用|
| !readon             | BOTの読み上げをONにします。  ※読み上げを再開したい時に利用                                    　　 |
| !vvvoice            | BOTの声を変更します。「!vvvoice 0」で四国めたんに変更。「!vvvoice 1」でずんだもんに変更。   　　　　 |

