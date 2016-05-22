
/**
 *  【変数の初期化】
 */
// Googleからスクリプトをロード
google.load("search", "1");
google.load("feeds",  "1");
google.load("jquery", "1.4.3");

// Web AIの初期化
var $WA      = crocro.webAi;        // 短縮表記
var cQ       = new $WA.Query();     // クエリー
var cWSrch   = new $WA.WebSrch();   // Web検索用
var cISrch   = new $WA.WebSrch();   // 画像検索用
var cJpKw    = new $WA.JpKw({kwLenMin: 1});     // キーワード
var cJpSntnc = new $WA.JpSntnc();   // センテンス

var qKeyQckSrch = "qckSrch";    // 急速検索

var loadAnmArr          // ロード中アニメ配列
= [".(^o^).", "(^o^)..", "^o^)..(", "o^)..(^", "^)..(^o", ")..(^o^", "..(^o^)"];
var loadAnmCnt = 0;     // ロード中アニメ・カウンター

// 名前
var nmAi  = "ひまねちゃん";
var nmUsrDflt = "anonymous";
var nmUsr = nmUsrDflt;

var kwStrt;     // キーワード文字列
var kwEscp = "ところで";        // 失敗時用キーワード
var reKwEscp = /^ところで/;     // 失敗時用キーワード正規表現
var kwErr = "ふわー。暇ねえ。"; // エラー時キーワード

/*
 *--------------------------------------------------
 */

/**
 *  【初期化処理】
 */
cWSrch.ready(function(){
  // デフォルトの固定URLを作成
  $("#fix_url_raw").val(getUrlBs());
  $("#fix_url_min").val(getUrlBs());
  setTimeout(loadDelay, 1000);    // 遅延読み込み

  // クエリーの初期化
  cQ.prsFrmLocation({useH: true});

  // 検索結果出力先の追加
  var deco = function(r) {
    if ("unescapedUrl" in r) return r.unescapedUrl + "\n";
    return "";
  }
  cISrch.appndResTgt = "vwSrchRes";
  cWSrch.appndResTgt = "vwSrchRes";
  cISrch.appndResDeco = deco;
  cWSrch.appndResDeco = deco;

  // 画像検索用WebSrchを初期化
  cISrch
  .init({
    type : "img",
    opt : function(obj) {
      obj.setRestriction(google.search.ImageSearch.RESTRICT_IMAGETYPE,
        google.search.ImageSearch.IMAGETYPE_PHOTO);     // 顔画像
    }
  })
  .start();

  // Web検索用WebSrchを初期化
  cWSrch
  .brand("gglBrnd")
  .init({
    type : "web",
    opt : function(obj) {
      obj.setResultSetSize(google.search.Search.LARGE_RESULTSET); // 8件
    }
  })
  .init({
    type : "nws",
    opt : function(obj) {
      obj.setResultSetSize(google.search.Search.LARGE_RESULTSET); // 8件
    }
  })
  .feed({
    // 名前の初期化（有名人リストからランダムで取得）
    url : function() {
      return "http://searchranking.yahoo.co.jp/rss/total_ranking-people-rss.xml";
    },
    res : function(res) {
      if (! res.error) {
        var nmGetArr = [];
        for (var i = 0; i < res.feed.entries.length; i++) {
          var e = res.feed.entries[i];
          e.title = e.title.replace(/（.+?）|\(.+?\)/g, "");
          if (e.title == "") continue;
          nmGetArr.push(e.title);
        }
        nmGetArr = $WA.Tools.shffl(nmGetArr);   // シャッフル
        if (nmGetArr instanceof Array) {
          $("#nm").val(nmGetArr[0]);
        }
      }
    }
  })
  .setEachCall(function(){
    // ステップごとに呼び出される処理を追加
    drwLoadAnm(true);   // ロードアニメ描画
  })
  .start();
});

/*
 *--------------------------------------------------
 */

/**
 *  @title  【検索開始】
 *  @description
 *
 *      検索を実行する。ボタンから呼び出す。
 */
function strtSrchBtn() {
  // 実行中回避処理
  if (cWSrch.isExec) {
    alert("現在、検索中です。\n\n少々お待ち下さい。");
    return;
  }

  // 検索実行
  cWSrch.reset();
  strtSrch();
  cWSrch.start();
}
function strtSrch() {
  // 変数の初期化
  nmUsr = $("#nm").val() || nmUsrDflt;
  kwStrt = $("#q").val();     // 開始キーワード
  var kwArr = []      // 開始キーワード

  // 検索結果の削除
  $("#vwSrchRes").val("");
  $("#getS").val("");     // 取得文字列表示の削除

  // トリム
  kwStrt = kwStrt.replace(/^[ 　]+|[ 　]$/g, "");
  nmUsr  = nmUsr.replace(/^[ 　]+|[ 　]$/g, "");

  var htmlStr = res2Html(nmUsr, kwStrt);
  apndTlk(htmlStr);   // 会話の追加

  kwStrt = kwStrt.replace(/[!！\?？]/g, "");

  // オブジェクトの内容のリセット
  cJpKw.reset();          // 日本語キーワードオブジェクトの内容をリセット
  cJpSntnc.reset();       // 日本語文章オブジェクトの内容をリセット

  // 検索処理
  cWSrch
  .feed({
    url : function() {
      return "http://search.twitter.com/search.rss?rpp=100&q="
      + encodeURIComponent(kwStrt);
    },
    res : function(res) {
      if (res.error) return;  // 無効→次へ

      // 会話の収集
      var tlkArr = [];
      for (var i = 0; i < res.feed.entries.length; i++) {
        // 変数の初期化
        var e = res.feed.entries[i];
        var twitArr = chkTwitSntnc(e.title);
        if (twitArr.length == 0) continue;  // 空なので飛ばす
        tlkArr = tlkArr.concat(twitArr);
      }

      // 有効会話の確認
      if (tlkArr.length == 0) {
        $("#getS").val($("#getS").val() + "\n--<1st>--\nget 0.\n"); // 取得文字列表示
        return; // 無効→次へ
      }
      tlkArr = cJpSntnc.sortLen(tlkArr, 10);  // 10文字位置でソート
      $("#getS").val($("#getS").val() + "\n--<1st>--\n" + tlkArr.join("\n")); // 取得文字列表示
      var htmlStr = res2Html(nmAi, tlkArr[0]);
      apndTlk(htmlStr);   // 会話の追加
      endSrch();          // 検索終了
    }
  })
  .add(function() {
    // 入力文章からキーワード取得
    cJpKw.reset();
    cJpKw.addSrc(kwStrt);
    kwArr = cJpKw.getStrArr();
    if (kwArr.length == 0) {
      // キーワードがないので、キーワードをWeb検索から収集
      cWSrch
      .insrtOn()  // 挿入モード オン
      .srch({
        // Webを検索して文章を収集
        type : "web",
        key : kwStrt,
        res : function(res, cursor) {
          if (! res || res.length <= 0) return;   // 結果なし
          for (var i = 0; i < res.length; i ++) {
            var r = res[i];
            cJpKw.addSrc(r.content);    // キーワード用に文字列を追加
          }
        }
      })
      .add(function() {
        // キーワード取得
        kwArr = cJpKw.getStrArr();
        kwArr = $.map(kwArr, function(n, i){return (n != kwStrt) ? n : []});
        // 元文字列は除く
        $("#getS").val($("#getS").val() + "\n--<kw:" + kwStrt + ">--\n" + kwArr.join("\n"));
        // 取得文字列表示
        if (kwArr.length == 0) {
          // 有効なキーワードがなかった
          cWSrch
          .insrtOn()  // 挿入モード オン
          .feed({
            // 話題転換を行う
            url : function() {
              return "http://search.twitter.com/search.rss?rpp=100&q="
              + encodeURIComponent(kwEscp);
            },
            res : function(res) {
              if (res.error) return;  // 無効→次へ

              // 会話の収集
              var tlkArr = [];
              for (var i = 0; i < res.feed.entries.length; i++) {
                // 変数の初期化
                var e = res.feed.entries[i];
                var twitArr = chkTwitSntnc(e.title);
                if (twitArr.length == 0) continue;  // 空なので飛ばす
                tlkArr = tlkArr.concat(twitArr);
              }

              // 有効会話の確認
              if (tlkArr.length == 0) {
                $("#getS").val($("#getS").val() + "\n--<2st>--\nget 0.\n");
                // 取得文字列表示
                return; // 無効→次へ
              }
              tlkArr = cJpSntnc.sortLen(tlkArr, 10);  // 10文字位置でソート
              $("#getS").val($("#getS").val() + "\n--<2nd>--\n" + tlkArr.join("\n")); // 取得文字列表示

              var htmlStr = res2Html(nmAi, tlkArr[0]);
              apndTlk(htmlStr);   // 会話の追加
              endSrch();          // 検索終了
            }
          })
          .add(function() {
            // 失敗時はエラー用キーワードをしゃべらせる
            var htmlStr = res2Html(nmAi, kwErr);
            apndTlk(htmlStr);   // 会話の追加
            endSrch();      // 検索終了
          })
          .insrtOff();    // 挿入モード オフ
        }
      })
      .insrtOff();    // 挿入モード オフ
    }
  })
  .feed({
    // キーワード収集に成功したので、検索を実行する
    url : function() {
      var kw = $WA.Tools.shffl(kwArr)[0];
      return "http://search.twitter.com/search.rss?rpp=100&q="
      + encodeURIComponent(kw);
    },
    res : function(res) {
      if (res.error) {
        $("#getS").val($("#getS").val() + "\n--<3rd>--\nget 0.\n");
        // 取得文字列表示
        return; // 無効→次へ
      }

      // 会話の収集
      var tlkArr = [];
      for (var i = 0; i < res.feed.entries.length; i++) {
        // 変数の初期化
        var e = res.feed.entries[i];
        var twitArr = chkTwitSntnc(e.title);
        if (twitArr.length == 0) continue;  // 空なので飛ばす
        tlkArr = tlkArr.concat(twitArr);
      }

      // 有効会話の確認
      if (tlkArr.length == 0) return; // 無効→次へ
      tlkArr = cJpSntnc.sortLen(tlkArr, 10);  // 10文字位置でソート
      $("#getS").val($("#getS").val() + "\n--<3rd>--\n" + tlkArr.join("\n")); // 取得文字列表示
      var htmlStr = res2Html(nmAi, tlkArr[0]);
      apndTlk(htmlStr);   // 会話の追加
      endSrch();          // 検索終了
    }
  })
  .add(function() {
    // 失敗時はエラー用キーワードをしゃべらせる
    var htmlStr = res2Html(nmAi, kwErr);
    apndTlk(htmlStr);   // 会話の追加
    endSrch();      // 検索終了
  })
}

/*
 *--------------------------------------------------
 */

/**
 *  @title  【Twitter文字列の確認】
 *  @description
 *
 *      Twitterの文字列を有効な文字列に加工した後、今回の検索で使えるか判定して、結果を戻す。
 *
 *  @param  srcStr      元文字列
 *  @return 有効な文字列の配列
 */
function chkTwitSntnc(srcStr) {
  var chkStr = srcStr;
  var resArr = [];

  // 不要部分の除去
  chkStr = chkStr.replace(/ *@[0-9a-z_]+ */ig, "");       // アカウント
  chkStr = chkStr.replace(/ *#[0-9a-z_-]+ */ig, "");      // ハッシュタグ
  chkStr = chkStr.replace(/ *http[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+ */ig, ""); // URL
  chkStr = chkStr.replace(/[\n]/ig, "");      // 改行
  chkStr = chkStr.replace(/^[ 　]+|[ 　]$/g, "");   // トリム
  chkStr = chkStr.replace(/[ 　]{2, }/g, " "); // スペースの詰め

  // 文章を分割
  var tmpArr = chkStr.split(/[ 　\.。]/);

  // 有効確認
  for (var i = 0; i < tmpArr.length; i ++) {
    if (kwStrt.length >= 5) {
      if (tmpArr[i] == kwStrt) continue;      // 元の文と同じなので飛ばす
    }
    if (tmpArr[i].indexOf(kwStrt) >= 0) continue;   // 元の文を含むので飛ばす
    if (tmpArr[i] == "") continue;                  // 空なので飛ばす
    if (! tmpArr[i].match(/[ぁ-んァ-ヶー一-龠]/)) continue;    // 日本語がないので飛ばす
    resArr.push(tmpArr[i]);
  }
  return resArr;
}

/**
 *  @title  【URL基本部分取得】
 *  @description
 *
 *      URLの本体を取得。
 *
 *  @return URLの本体部分
 */
function getUrlBs() {
  var urlStr = "http://www.google.com/";  // ダミー
  if (! $WA.Tools.isLocal()) {
    // ネット上なので、URLをそのまま利用
    urlStr = location.href.replace(/\?.*$|#.*$/g, "");  // 本体部分のみ取得
  }
  return urlStr;
}

/**
 *  @title  【検索終了】
 *  @description
 *
 *      検索を終了する。
 *
 *  @return なし
 */
function endSrch() {
  drwLoadAnm(false);      // ロードアニメ終了描画
  cWSrch.cmndsBreak();    // 終了
  kw2Img();               // 画像の挿入
}

/**
 *  @title  【結果からHTML作成】
 *  @description
 *
 *      検索結果を元にして、HTMLを作成する。
 *
 *  @param  nm      名前
 *  @param  res     結果文字列
 *  @return HTML文字列
 */
function res2Html(nm, tlk) {
  // 変数の初期化
  var resStr = "";

  // HTMLの作成
  if (nm == nmAi) {
    var imgStr = "";
    imgStr += '<img src="pic/himane130x115.jpg" width=130 height=115 ';
    imgStr += 'title="' + nmAi + '">';
    resStr += wrpDiv(imgStr,  "itm_fc")
  } else {
    resStr += wrpDiv(nm,  "imgRep", "display: none;");
  }
  resStr += wrpDiv(wrpSpan(nm),  "itm_nm");
  resStr += wrpDiv(wrpSpan(tlk), "itm_tlk");
  resStr += wrpDiv("",  "itm_splt");

  resStr = wrpDiv(resStr, "itm_frm");
  return resStr;
}

function wrpDiv(inSTr, cls, style) {
  if (! cls) cls = "";
  if (! style) style = "";
  var resStr = "";
  resStr += '<div class="' + cls + '" style="' + style + '">';
  resStr += inSTr;
  resStr += '</div>';
  return resStr;
}

function wrpSpan(inSTr, cls) {
  if (! cls) cls= "";
  var resStr = "";
  resStr += '<span class="' + cls + '">';
  resStr += inSTr;
  resStr += '</span>';
  return resStr;
}

/**
 *  @title  【会話追加】
 *  @description
 *
 *      会話を画面に追加する。
 *
 *  @param  htmlStr     HTML文字列
 *  @return なし
 */
function apndTlk(htmlStr) {
  $("#resVw").prepend(htmlStr);
}

/**
 *  @title  【ロードアニメ描画】
 *  @description
 *
 *      ロード中のアニメを描画する。
 *
 *  @param  loading     ロード中か否か
 *  @return なし
 */
function drwLoadAnm(loading) {
  var dwStr = ""
  if (loading) {
    dwStr = "Now Loading... " + loadAnmArr[loadAnmCnt ++ % loadAnmArr.length];
  }
  $("#loading").text(dwStr);
}

/*
 *--------------------------------------------------
 */

/**
 *  @title  【キーワードをイメージに置換】
 *  @description
 *
 *      画像置換クラスで囲われたキーワードを画像に置換する。
 *
 *  @return なし
 */
function kw2Img() {
  // 画像キーワードの取得
  var imgRep = [];
  $(".imgRep").each(function(){
    imgRep.push($(this));
  });
  var imgRepSz = imgRep.length;

  // 検索処理
  cISrch
  .reset()
  .srch({
    // 画像を検索して、キーワードを置換する
    type : "img",
    loop : imgRepSz,
    key : function(){return imgRep[cISrch.loopCnt].text();},
    res : function(res, cursor) {
      if (res && res.length <= 0) return; // 結果なし

      // 結果あり
      var r = res[0];

      // HTML文字列の作成
      var htmlStr = "";
      htmlStr += '<img src="' + r.tbUrl + '"'
      + ' width='  + (r.tbWidth  * 1)
      + ' height=' + (r.tbHeight * 1)
      + ' border=0'
      + ' title="' + cISrch.srchKw + '"'
      + '>';

      htmlStr = '<a href="' + r.unescapedUrl + '"'
      + ' target="_blank"'
      + '>'
      + htmlStr
      + '</a>';
      htmlStr = wrpDiv(htmlStr,  "itm_fc")

      // HTMLの置換
      imgRep[cISrch.loopCnt].show();
      imgRep[cISrch.loopCnt].html(htmlStr);
    }
  })
  .start();
}

function chngImg(n) {
  $("#imgInsrtTb" + n).hide();
  $("#imgInsrt" + n).show();
}

/**
 *  @title  【遅延読み込み】
 *  @description
 *
 *      HTMLの一部を遅延読み込みする。
 *
 *      以下、遅延領域のサンプル。
 *
 *      <span class="delay">
 *          <noscript>No JavaScript</noscript>
 *          <span class="delayBefore">Now Loading...</span>
 *          <span class="delayAfter"><!--
 *              hoge hoge
 *          --></span>
 *      </span>
 *
 *  @return なし
 */
function loadDelay() {
  $(".delay").each(function () {
    // 遅延前の表示を消す
    $(this).children(".delayBefore").html("");

    // 遅延後の表示を出す
    var repStr = $(this).children(".delayAfter").html();
    repStr = repStr.replace(/^<!--|-->$/g, "");
    $(this).children(".delayAfter").html(repStr);
  });
}

/*
 *--------------------------------------------------
 */

/**
 *  @title  【テスト用】
 *  @description
 *
 *      テスト用コードを記述する。
 */
function test() {
}
