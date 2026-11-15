/* RE-FRESH Lab: shared backend config + helpers (student app, wall, teacher) */
var RL = (function(){
  "use strict";
  var URL_ = "https://qhqlczscdutoycrhnslf.supabase.co";
  var KEY_ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocWxjenNjZHV0b3ljcmhuc2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzOTgyNTgsImV4cCI6MjEwOTk3NDI1OH0.geURnjyxXzrPCch_v47ureBb0EUK3gFzUjYcAJLUruM";
  var BUCKET = "refresh-lab";
  function hdr(extra){ var h = {apikey: KEY_, Authorization: "Bearer " + KEY_}; for (var k in extra) h[k] = extra[k]; return h; }
  function session(){
    var m = /[?&]lop=([^&#]+)/.exec(location.search);
    var s = m ? decodeURIComponent(m[1]).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20) : "";
    return s.length >= 2 ? s : "";
  }
  function upsert(session, groupNo, product, data){
    return fetch(URL_ + "/rest/v1/refresh_lab?on_conflict=session,group_no", {
      method: "POST",
      headers: hdr({"Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal"}),
      body: JSON.stringify({session: session, group_no: groupNo, product: product || null, data: data, updated_at: new Date().toISOString()})
    }).then(function(r){ if (!r.ok) return r.text().then(function(t){ throw new Error(r.status + " " + t); }); return true; });
  }
  function rows(session, groupNo){
    var q = "/rest/v1/refresh_lab?select=*&session=eq." + encodeURIComponent(session) + (groupNo ? "&group_no=eq." + groupNo : "") + "&order=group_no.asc";
    return fetch(URL_ + q, {headers: hdr({}), cache: "no-store"}).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function upload(path, blob){
    return fetch(URL_ + "/storage/v1/object/" + BUCKET + "/" + path, {
      method: "POST", headers: hdr({"Content-Type": blob.type || "image/jpeg", "x-upsert": "false", "cache-control": "31536000"}), body: blob
    }).then(function(r){ if (!r.ok) return r.text().then(function(t){ throw new Error(r.status + " " + t); }); return URL_ + "/storage/v1/object/public/" + BUCKET + "/" + path; });
  }
  /* compress an image File to a JPEG Blob (max 1600 px, quality 0.8) */
  function compress(file){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function(){
        var k = Math.min(1, 1600 / Math.max(im.width, im.height));
        var cv = document.createElement("canvas"); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function(b){ b ? res(b) : rej(new Error("toBlob")); }, "image/jpeg", 0.8);
      };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error("decode")); };
      im.src = url;
    });
  }
  return {
    url: URL_, key: KEY_, session: session, upsert: upsert, rows: rows, upload: upload, compress: compress,
    PLC: {gioithieu: "Giới thiệu", tangtruong: "Tăng trưởng", baohoa: "Bão hòa", suythoai: "Suy thoái"},
    PROD: {matcha: "Matcha Ice", detox: "Tropical Detox", energy: "Energy Z", bubble: "Bubble Tea Box"},
    SLOT: {cot: "Lợi ích cốt lõi", thuc: "Sản phẩm thực tế", gt: "Sản phẩm gia tăng", bb: "Các lớp bao bì", look: "Diện mạo sản phẩm mới"},
    KIND: {sketch: "Phác thảo tay", ai: "Ảnh do AI tạo"}
  };
})();
