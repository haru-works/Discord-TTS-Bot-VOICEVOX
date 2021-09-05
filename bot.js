//--------------------------------------------------------------
//
// Discord TTS BOT by VOICEVOX
//
//--------------------------------------------------------------

//--------------------------------------------------------------
//ライブラリインポート
//--------------------------------------------------------------
//環境変数ライブラリ
require('dotenv').config();
//HTTP通信ライブラリ
const axios  = require("axios");
//ファイル保存＆削除ライブラリ
const fs = require("fs");
//Discordライブラリ
const Discord = require('discord.js');

//--------------------------------------------------------------
//Discord初期化
//--------------------------------------------------------------
const discordClient = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL'] ,
                                          messageCacheMaxSize: 20, 
                                          messageSweepInterval: 30});

//--------------------------------------------------------------
//prefix環境変数読込
//--------------------------------------------------------------
let prefix = process.env.PREFIX;

//--------------------------------------------------------------
//環境変数読込
//--------------------------------------------------------------
//BOTトークン
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

//--------------------------------------------------------------
//チャンネル環境変数読込
//--------------------------------------------------------------
//読み上げ用 
const ChannelId = process.env.VOICE_TEXT_CHANNEL_ID;

//--------------------------------------------------------------
//各種モード
//--------------------------------------------------------------
//VCモード
var vcMode = false;

//--------------------------------------------------------------
//VOICEVOX用http通信オブジェクト
//--------------------------------------------------------------
const rpc = axios.create({ baseURL: process.env.VOICEVOX_ENGINE, proxy: false });

//--------------------------------------------------------------
//VOICEVOX用ボイス変更テーブル
//--------------------------------------------------------------
const VoiceTableVOICEVOX = ['0:四国めたん', '1:ずんだもん'];
//ユーザーボイス変数
var userVoiceVOICEVOX = {};

//--------------------------------------------------------------
//音声変換キュー変数
//--------------------------------------------------------------
let queueVV = [];
let isPlaying = false;
const voiceDataDir = "voice_data"

//--------------------------------------------------------------
//声変更関数(VOICEVOX)
//--------------------------------------------------------------
function getVoiceByUserVV(id) {
  if (id in userVoiceVOICEVOX) {
      return userVoiceVOICEVOX[id];
  };

  //デフォルト固定(四国めたん)
  var voice = VoiceTableVOICEVOX[0];
  userVoiceVOICEVOX[id] = voice;
  return voice;
}

//--------------------------------------------------------------
//音声変換関数(VOICEVOX)
//--------------------------------------------------------------
function getYomiageVV(obj,id,ch) {

  //トーク文字格納用
  var result = "";
  //文字数チェック
  if(obj.msg.length > 50){
    //指定文字数で切り取り
    result = obj.msg.substr(0,47) + "以下略";
  }else{
    result = obj.msg;
  }

  //textをURIエンコードした形でaudio_queryに渡してパラメータを生成する
  rpc.post(`audio_query?text=${encodeURI(result)}&speaker=${obj.voice}`)
  .then(audio_query => {
      //audio_query.dataの中身のjsonデータをsynthesisに渡して音声wavデータ生成
      rpc.post(`synthesis?speaker=${obj.voice}`, JSON.stringify(audio_query.data), {
                    responseType: "arraybuffer",
                    headers: {
                        "accept": "audio/wav",
                        "Content-Type": "application/json"
                    }
    })
    .then(synthesis => {
      //Bufferに変換して書き出す
      fs.writeFileSync(voiceDataDir + "/" + `voiceVV_${id}.wav`, new Buffer.from(synthesis.data));
      //キューにセット
      addAudioToQueueVV(voiceDataDir + "/" + `voiceVV_${id}.wav`, ch);
      //再生
      if(!isPlaying){
        playAudioVV();
      }
    })
    .catch(err => {
        console.error('音声変換関数(VOICEVOX):synthesisで例外エラー発生: ', err.message);
        return;
      });
  })
  .catch(err => {
    console.error('音声変換関数(VOICEVOX):audio_queryで例外エラー発生(多分VOICEVOX.exeが起動してない): ', err.message);
    return;
  });
}

//--------------------------------------------------------------
//音声データをキューへ追加(VOICEVOX)
//--------------------------------------------------------------
function addAudioToQueueVV(voiceFile, voiceChannel) {
  queueVV.push(
      { voiceFile: voiceFile, voiceChannel: voiceChannel }
  );
  console.log("Add queue --> Add voice_file:" + voiceFile);
}

//--------------------------------------------------------------
//キューの順番で音声処理(VOICEVOX)
//--------------------------------------------------------------
function playAudioVV() { 
  if (queueVV.length >= 1) {
      isPlaying = true
      queueVV[0].voiceChannel.join().then(connection => {
        const dispatcher = connection.play(queueVV[0].voiceFile,{ volume: false });
        dispatcher.on('finish', () => {
            console.log("Done queue --> voice_file:" + queueVV[0].voiceFile);
            fs.unlinkSync(queueVV[0].voiceFile);
            queueVV.shift();
            playAudioVV();
        })
      })  
  }else {
    isPlaying = false
  }
}

//--------------------------------------------------------------
//メイン処理
//--------------------------------------------------------------
(async function main() {

  //--------------------------------------------------------------
  //ディスコードトークンが設定されているか？
  //--------------------------------------------------------------
  if(BOT_TOKEN == undefined){
    console.log('DISCORD_BOT_TOKENが未設定');
    process.exit(0);
  };

  //--------------------------------------------------------------
  //discordログイン
  //--------------------------------------------------------------
  discordClient.login(BOT_TOKEN);
   
  //--------------------------------------------------------------
  //Bot準備
  //--------------------------------------------------------------
  discordClient.once('ready', () => {
    console.log("Discord connection successful!!");
    console.log("Discord Bot ready!!");
    return ;
  });

  //--------------------------------------------------------------
  // テキストメッセージ受信時のイベント
  //--------------------------------------------------------------
  discordClient.on('message', async (message) => {
                     
    //--------------------------------------------------------------
    // チェンネルチェック
    //--------------------------------------------------------------
    if (message.channel.id !== ChannelId) { 
      //設定したチャンネルID以外は処理しない
      console.log("チャンネルIDが異なるので以降の読み上げ処理はしません");
      return; 
    }
     
    //--------------------------------------------------------------
    // 発言メッセージの送信者チェック
    //--------------------------------------------------------------
    if (message.author.id == discordClient.user.id || message.author.bot){
      //メッセージ送信者がBOT自身なら無視
      return;
    }
        
    //--------------------------------------------------------------
    // 起動コマンド
    //--------------------------------------------------------------
    const [commandJoin, ...argsJoin] = message.content.split(' ')
    if (commandJoin === `${prefix}vvjoin`) {
      //デバック
      console.log('ユーザーID message.author.id ' + message.author.id );
      console.log('BOT ID discordClient.user.id ' + discordClient.user.id);
      console.log('ユーザの参加VC member.voice.channel ' + message.member.voice.channel);
      //ボイスチャンネルチェック
      if(message.member.voice.channel === null){
        //メッセージ送信 
        message.guild.channels.cache.get(ChannelId).send(message.author.username + `はボイスチャンネルに参加してないよ！\n` +
                                                                                    `BOTを召喚する時は、ボイスチャンネルに参加してから「${prefix}vvjoin」コマンドを打ってね！\n`+
                                                                                    `自分がボイスチャンネルに参加する時は、ボイスチャンネルのタイトルをクリック、または、タップしてね！`);
        console.log('コマンドを打ったユーザーがVCに接続していいないのでJOIN処理を終了します');
        return;
      }
        //デバック
        console.log('BOTがVCに接続していいないのでJOIN処理を続行します');
        //メッセージ送信 
        message.guild.channels.cache.get(ChannelId).send("VCに参加中・・・")
        // ボイスチャンネルに接続
        message.member.voice.channel.join().then(connection => {

          //接続時のメッセージ表示
          message.guild.channels.cache.get(ChannelId).send(`☆VCに参加成功☆\n` +
                                                            `---------------------------\n` +
                                                            `●接続先サーバー：` + message.guild.name + `\n` +
                                                            `●接続先ボイスチャンネル：` + message.member.voice.channel.name + `\n` +
                                                            `●読み上げ対象チャンネル：` + message.channel.name + `\n` +
                                                            `---コマンド一覧-------------\n` +
                                                            `●VC参加　${prefix}vvjoin\n` +
                                                            `●VC退出　${prefix}vvbye\n` +
                                                            `●読み上げOFF　${prefix}readoff\n` +
                                                            `●読み上げON　${prefix}readon\n` +
                                                            `●VOICEVOXの声の変更　${prefix}vvvoice [番号]\n ` +
                                                            `　例：ずんだもんに変更する場合「 ${prefix}vvvoice 1 」\n` + 
                                                            `●声リスト\n` +
                                                            `　0:四国めたん\n` +
                                                            `　1:ずんだもん\n` +
                                                            `---------------------------\n`
                                                            );
          //読み上げモードON
          vcMode = true;
          console.log('接続サーバー:' + message.guild.name);
          console.log('接続ボイスチャンネル:' + message.member.voice.channel.name);
          console.log('読み上げ対象チャンネル:' + message.channel.name);
          console.log('ボイスチャンネルに参加成功!');    
          return;                                         
        });
            
    }
    
    //--------------------------------------------------------------
    // 終了コマンド
    //--------------------------------------------------------------
    const [commandBye, ...argsBye] = message.content.split(' ')
    if (commandBye === `${prefix}vvbye`){
      if(discordClient.voice.connections.get(message.guild.id) === undefined){  
        console.log('BOTがVCにいないので退出しません');  
        return;   
      }else{
        //切断
        discordClient.voice.connections.get(message.guild.id).disconnect();  
        //読み上げモードOFF
        vcMode = false;
        //退出メッセージ送信
        message.guild.channels.cache.get(ChannelId).send(":dash:");
        console.log('ボイスチャンネルから退出しました');  
        return;
      }
    }
    
    //--------------------------------------------------------------
    // 読み上げONコマンド
    //--------------------------------------------------------------          
    const [commandReadon, ...argsReadon] = message.content.split(' ')
    if (commandReadon === `${prefix}readon`){  
      if(discordClient.voice.connections.get(message.guild.id) === undefined){
        console.log('BOTがVCにいないのでreadonしません');
        return;
      }
      //読み上げ設定ONにする
      if(vcMode === false){           
        vcMode = true;           
        message.guild.channels.cache.get(ChannelId).send('読み上げ設定ONにしました。読み上げします。');        
        console.log('読み上げON');               
      }else{
        message.channel.send('読み上げ設定はONです。');           
      }  
      return;
    }

    //--------------------------------------------------------------
    // 読み上げOFFコマンド
    //--------------------------------------------------------------    
    const [commandReadoff, ...argsReadReadoff] = message.content.split(' ')
    if (commandReadoff === `${prefix}readoff`){    
      if(discordClient.voice.connections.get(message.guild.id) === undefined){
        console.log('BOTがVCにいないのでreadoffしません');
        return;
      }
      //読み上げ設定OFFにする
      if(vcMode === true){ 
        vcMode = false; 
        message.guild.channels.cache.get(ChannelId).send('読み上げ設定OFFにしました。読み上げしません。');
        console.log('読み上げOFF');       
      }else{
        message.channel.send('読み上げ設定はOFFです。');
      }  
      return;        
    }

    //--------------------------------------------------------------
    // VOICEVOXボイス変更設定コマンド
    //--------------------------------------------------------------    
    const [commandVoicevv, ...argsVoicevv] = message.content.split(' ')
    if (commandVoicevv === `${prefix}vvvoice`){
      //BOTが接続している接続ボイスチャンネルチェック
      if(discordClient.voice.connections.get(message.guild.id) === undefined){
        console.log('BOTがVCにいないのでVOICEVOXのvoice変更しません');
        return;
      }
      //コマンド後のメッセージ分解
      const [...VoicevvMsg] = argsVoicevv;
      //ボイス設定値範囲チェック
      if(Number(VoicevvMsg[0]) > 2 || Number(VoicevvMsg[0]) < 0){
        message.guild.channels.cache.get(ChannelId).send("声の設定は0～1の間で設定してね。");
        console.log(VoicevvMsg[0]);
        console.log('vvvoice設定コマンドが不正(設定範囲外)');
        return;
      }
      //ボイス設定
      userVoiceVOICEVOX[message.author.id] = VoiceTableVOICEVOX[VoicevvMsg[0]];
      //ボイス設定チェック
      if(userVoiceVOICEVOX[message.author.id] === undefined){
        message.guild.channels.cache.get(ChannelId).send("声の設定は0～1の間で設定してね。");
        console.log('vvvoice設定コマンドが不正(不正な値)');
        return;
      }
      //voice変更メッセージ送信   
      message.guild.channels.cache.get(ChannelId).send(message.author.username + "の声を" + userVoiceVOICEVOX[message.author.id] + "に変更したよ。");
      console.log(message.author.username + "の声を" + userVoiceVOICEVOX[message.author.id] + "に変更");
      return;
    }

    //--------------------------------------------------------------
    // 読み上げ
    //--------------------------------------------------------------
    //読み上げ設定OFFの場合は読み上げしない    
    if(vcMode === false){  return;  }
    if(discordClient.voice.connections.get(message.guild.id) === undefined){
      console.log('BOTがVCにいないので読み上げしません');
      return;  
    } 
    //メッセージの加工
    const text = message.content
                        .replace(/https?:\/\/\S+/g, '')  // URLを除去
                        .replace(/<a?:.*?:\d+>/g, '')    // カスタム絵文字を除去
                        .replace( /[~!"#\$%&'\(\)\*\+,\-\.\/:;<=>\?@\[\\\]\^_`\{\|\}]/g,'') //記号を除去
                        .replace('vvjoin','')
                        .replace('vvbye','')
                        .replace('vvvoice','')
                        .replace('readon','')
                        .replace('readoff',''); 
    // テキストが空なら読み上げしない 
    if(!text) { return; } 
    //メッセージのボイスチャンネルがあったら読み上げする
    if (message.member.voice.channel) {  
      
        try{
          // ボイス設定
          var voice = getVoiceByUserVV(message.author.id).slice(0,1);
          //テキスト⇒音声ストリーム
          getYomiageVV({voice: voice,msg: text},message.id,message.member.voice.channel);
        }catch(err){
          console.error('例外エラーが発生:' + err.message);
          return;
        }

    }else{
        console.log('BOTがVCにいないので読み上げしません');
    }
  });
       
})().catch((e) => console.error(e));




