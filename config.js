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
    PROD: {tra: "Trà trái cây", mypham: "Mỹ phẩm", banhtrungthu: "Bánh trung thu", caphe: "Cà phê hòa tan"},
    /* group 1-4 = category; groups 5-8 choose explicitly */
    GROUP_PROD: {1: "tra", 2: "mypham", 3: "banhtrungthu", 4: "caphe"},
    KIND: {sketch: "Phác thảo tay", ai: "Ảnh do AI tạo"},
    NOTE: "Hình ảnh do AI tạo chỉ minh họa ý tưởng; không chứng minh tính khả thi hay sự tồn tại của nhu cầu thị trường.",
    /* PHIẾU THIẾT KẾ SẢN PHẨM, sections A-I. Shared by index.html (form) and wall.html (detail view).
       Field: {k:key, l:label, t:"in"|"ta"|"ck"|"rd"|"fix", o:[options], v:fixed value}
       {h:hint} · {tbl:[col1,col2], rows:[[key,label]]} · {tbl2:[c0,c1,c2], rows:[[key1,key2]]} · {ph:slot} · {score:[[key,label,max]]} */
    SHEET: [
      {id: "A", step: 1, t: "A. Thông tin chung và phân loại", f: [
        {k: "a_nhom", l: "Nhóm số / Tên nhóm", t: "in"},
        {k: "a_tv", l: "Thành viên tham gia", t: "in"},
        {k: "a_ten", l: "Tên sản phẩm dự kiến", t: "in"},
        {k: "a_kh", l: "Khách hàng mục tiêu và nhu cầu chính cần đáp ứng", t: "ta"},
        {k: "a_pl", l: "Phân loại sản phẩm (đánh dấu)", t: "ck", o: ["Hàng lâu bền", "Hàng sử dụng ngắn hạn", "Dịch vụ", "Mua thường ngày", "Mua ngẫu hứng", "Mua khẩn cấp", "Mua có lựa chọn", "Nhu cầu đặc thù", "Nhu cầu thụ động"]},
        {k: "a_ly", l: "Lý do phân loại", t: "ta"}]},
      {id: "B", step: 1, t: "B. Ba cấp độ của sản phẩm", f: [
        {k: "b_cotloi", l: "1. Sản phẩm cốt lõi: Khách hàng thực sự tìm kiếm lợi ích gì?", t: "ta"},
        {h: "2. Sản phẩm hiện thực"},
        {tbl: ["Yếu tố sản phẩm hiện thực", "Mô tả của nhóm"], rows: [["b_ht_chatluong", "Chất lượng và thuộc tính"], ["b_ht_congdung", "Công dụng / tính năng"], ["b_ht_kieudang", "Kiểu dáng và thiết kế"], ["b_ht_nhanhieu", "Nhãn hiệu"], ["b_ht_baobi", "Bao bì"]]},
        {k: "b_bosung", l: "3. Sản phẩm bổ sung: dịch vụ, tiện ích hoặc giá trị gia tăng", t: "ta"}]},
      {id: "C", step: 2, t: "C. Nhãn hiệu và nhận diện", f: [
        {k: "c_ten", l: "Tên nhãn hiệu và ý nghĩa", t: "ta"},
        {k: "c_dauhieu", l: "Dấu hiệu nhãn hiệu: biểu tượng, màu sắc, chữ, hình ảnh nhận diện", t: "ta"},
        {k: "c_visao", l: "Vì sao nhãn hiệu phù hợp với khách hàng mục tiêu và có khả năng phân biệt?", t: "ta"},
        {k: "c_bienthe", l: "Lựa chọn sử dụng nhãn hiệu cho các biến thể", t: "rd", o: ["Chung một tên", "Dùng tên riêng cho từng biến thể"]},
        {k: "c_ly", l: "Lý do lựa chọn (lưu ý kiểm tra khả năng bảo hộ trước khi kinh doanh thật)", t: "ta"}]},
      {id: "D", step: 2, t: "D. Bao bì sản phẩm", f: [
        {tbl: ["Lớp / thành phần", "Mô tả thiết kế và chức năng"], rows: [["d_tiepxuc", "Lớp tiếp xúc trực tiếp với sản phẩm"], ["d_baove", "Lớp bảo vệ lớp tiếp xúc"], ["d_vanchuyen", "Bao bì vận chuyển và bảo quản"], ["d_nhan", "Nhãn và thông tin trên bao bì"]]},
        {k: "d_vatlieu", l: "Vật liệu, hình dáng, kích thước, màu sắc và sự tiện lợi", t: "ta"},
        {k: "d_chucnang", l: "Bao bì bảo vệ sản phẩm và truyền tải hình ảnh nhãn hiệu như thế nào?", t: "ta"},
        {k: "d_moitruong", l: "Yếu tố bảo vệ môi trường và những thông tin cần kiểm chứng", t: "ta"}]},
      {id: "E", step: 2, t: "E. Chủng loại và danh mục sản phẩm", f: [
        {k: "e_chungloai", l: "Sản phẩm chủ đạo thuộc chủng loại sản phẩm nào?", t: "in"},
        {h: "Đề xuất ít nhất hai mặt hàng hoặc phương án bổ sung để có căn cứ phân tích danh mục."},
        {tbl2: ["STT", "Mặt hàng / biến thể đề xuất", "Điểm khác biệt"], rows: [["e_mh1", "e_kb1"], ["e_mh2", "e_kb2"], ["e_mh3", "e_kb3"]]},
        {tbl: ["Chỉ tiêu", "Kết quả và giải thích"], rows: [["e_rong", "Chiều rộng (số chủng loại)"], ["e_dai", "Chiều dài (tổng số mặt hàng)"], ["e_sau", "Chiều sâu (số phương án của mặt hàng)"], ["e_matdo", "Mật độ (mức độ liên quan)"]]},
        {k: "e_morong", l: "Lựa chọn mở rộng danh mục của nhóm và lợi ích kỳ vọng", t: "ta"}]},
      {id: "F", step: 3, t: "F. Chu kỳ sống và phương án cải tiến", f: [
        {k: "f_giaidoan", l: "Sản phẩm mới dự kiến ra mắt ở giai đoạn", t: "fix", v: "Giới thiệu"},
        {k: "f_uutien", l: "Nhóm cần ưu tiên điều gì khi đưa sản phẩm mới ra thị trường?", t: "ta"},
        {h: "Tình huống giả định: Sau một thời gian, doanh số tăng chậm, cạnh tranh gay gắt hoặc giảm nhiều kỳ."},
        {k: "f_dauhieu", l: "Những dấu hiệu nào khiến nhóm đánh giá sản phẩm đang bão hòa / suy thoái?", t: "ta"},
        {k: "f_caitien", l: "Đề xuất ít nhất một cải tiến về lợi ích, thuộc tính, nhãn hiệu, bao bì hoặc danh mục", t: "ta"}]},
      {id: "G", step: 3, t: "G. Ảnh sản phẩm và sử dụng AI", f: [
        {ph: "sp"},
        {k: "g_prompt", l: "Prompt chính dùng để tạo hình ảnh / ý tưởng (có thể ghi liên kết)", t: "ta"},
        {k: "g_dieuchinh", l: "Nhóm đã tự điều chỉnh hoặc bác bỏ những gợi ý nào của AI?", t: "ta"},
        {k: "g_giadinh", l: "Các thông tin còn giả định hoặc cần kiểm chứng về công dụng, thành phần, an toàn, thị trường", t: "ta"}]},
      {id: "H", step: 4, t: "H. Chuẩn bị trình bày và phản biện (60 giây)", f: [
        {k: "h_1", l: "1. Sản phẩm mang đến lợi ích cơ bản và lợi ích gia tăng gì cho khách hàng?", t: "ta"},
        {k: "h_2", l: "2. Vì sao khách hàng nên chọn sản phẩm của nhóm thay vì sản phẩm cạnh tranh?", t: "ta"},
        {k: "h_3", l: "3. Sản phẩm có thể mang lại thêm giá trị gì để giữ chân khách hàng?", t: "ta"},
        {k: "h_thongdiep", l: "Thông điệp thuyết phục khách hàng của nhóm", t: "ta"}]},
      {id: "I", step: 4, t: "I. Tự đánh giá", f: [
        {score: [["i_1", "Khách hàng mục tiêu và lợi ích cốt lõi", 1.5], ["i_2", "Phân tích đúng ba cấp độ sản phẩm", 2], ["i_3", "Nhãn hiệu và giải thích lựa chọn", 1.5], ["i_4", "Bao bì, các lớp và chức năng", 1.5], ["i_5", "Danh mục và phương án mở rộng", 1], ["i_6", "Chu kỳ sống và cải tiến", 1.5], ["i_7", "Hợp tác, phản biện, minh bạch khi dùng AI", 1]]}]}
    ],
    num: function(x){ return String(x).replace(".", ","); }
  };
})();
