/* Waitlist form helpers: ISD country-code <select> + a lightweight city
 * type-ahead that shows ONLY matches for what you type (not the whole list). */
(function () {
  var CITIES = [
    "Mumbai","Delhi","New Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Surat","Pune",
    "Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Patna","Vadodara",
    "Ghaziabad","Ludhiana","Agra","Nashik","Faridabad","Meerut","Rajkot","Varanasi","Srinagar","Aurangabad",
    "Dhanbad","Amritsar","Navi Mumbai","Prayagraj","Ranchi","Howrah","Coimbatore","Jabalpur","Gwalior","Vijayawada",
    "Jodhpur","Madurai","Raipur","Kota","Guwahati","Chandigarh","Solapur","Hubballi","Tiruchirappalli","Bareilly",
    "Mysuru","Tiruppur","Gurugram","Aligarh","Jalandhar","Bhubaneswar","Salem","Warangal","Guntur","Noida",
    "Saharanpur","Gorakhpur","Bikaner","Amravati","Jamshedpur","Bhilai","Cuttack","Kochi","Nellore","Bhavnagar",
    "Dehradun","Durgapur","Asansol","Rourkela","Nanded","Kolhapur","Ajmer","Akola","Kalaburagi","Jamnagar",
    "Ujjain","Siliguri","Jhansi","Jammu","Mangaluru","Erode","Belagavi","Tirunelveli","Gaya","Jalgaon",
    "Udaipur","Tirupati","Davangere","Kozhikode","Kurnool","Ballari","Patiala","Bhagalpur","Muzaffarnagar","Latur",
    "Dhule","Rohtak","Korba","Bhilwara","Brahmapur","Muzaffarpur","Ahmednagar","Mathura","Kollam","Kadapa",
    "Bilaspur","Shahjahanpur","Satara","Vijayapura","Rampur","Shivamogga","Chandrapur","Junagadh","Thrissur","Alwar",
    "Nizamabad","Parbhani","Tumakuru","Khammam","Panipat","Darbhanga","Aizawl","Dewas","Karnal","Bathinda",
    "Eluru","Purnia","Satna","Sonipat","Sagar","Imphal","Ratlam","Hapur","Anantapur","Karimnagar",
    "Bharatpur","Begusarai","Gandhinagar","Puducherry","Shillong","Kohima","Itanagar","Gangtok","Panaji","Agartala",
    "Port Blair","Vellore","Ambala","Hosur","Nadiad","Bidar","Proddatur","Hindupur","Ongole","Rajahmundry",
    "New York","London","Dubai","Abu Dhabi","Singapore","Toronto","San Francisco","Los Angeles","Chicago","Seattle",
    "Sydney","Melbourne","Auckland","Dublin","Manchester","Birmingham","Doha","Riyadh","Kuwait City","Muscat",
    "Manama","Hong Kong","Kuala Lumpur","Bangkok","Jakarta","Berlin","Paris","Amsterdam","Frankfurt","Zurich",
    "Vancouver","Boston","Austin","Dallas","Houston","Washington","Kathmandu","Colombo","Dhaka","Tokyo"
  ];
  var ISD = [
    ["+91","🇮🇳 +91"],["+1","🇺🇸 +1"],["+44","🇬🇧 +44"],["+971","🇦🇪 +971"],["+65","🇸🇬 +65"],
    ["+61","🇦🇺 +61"],["+64","🇳🇿 +64"],["+353","🇮🇪 +353"],["+49","🇩🇪 +49"],["+33","🇫🇷 +33"],
    ["+31","🇳🇱 +31"],["+41","🇨🇭 +41"],["+46","🇸🇪 +46"],["+974","🇶🇦 +974"],["+966","🇸🇦 +966"],
    ["+965","🇰🇼 +965"],["+968","🇴🇲 +968"],["+973","🇧🇭 +973"],["+852","🇭🇰 +852"],["+60","🇲🇾 +60"],
    ["+66","🇹🇭 +66"],["+62","🇮🇩 +62"],["+81","🇯🇵 +81"],["+82","🇰🇷 +82"],["+86","🇨🇳 +86"],
    ["+27","🇿🇦 +27"],["+234","🇳🇬 +234"],["+254","🇰🇪 +254"],["+977","🇳🇵 +977"],["+94","🇱🇰 +94"],
    ["+880","🇧🇩 +880"],["+92","🇵🇰 +92"],["+55","🇧🇷 +55"],["+34","🇪🇸 +34"],["+39","🇮🇹 +39"],
    ["+90","🇹🇷 +90"],["+20","🇪🇬 +20"],["+7","🇷🇺 +7"]
  ];

  var sel = document.getElementById("wl-isd");
  if (sel) sel.innerHTML = ISD.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === "+91" ? " selected" : "") + ">" + x[1] + "</option>"; }).join("");

  var input = document.getElementById("wl-city");
  var list = document.getElementById("city-list");
  if (!input || !list) return;

  var active = -1, matches = [];
  function close() { list.classList.remove("open"); list.innerHTML = ""; active = -1; matches = []; }
  function render(q) {
    var ql = q.toLowerCase();
    matches = CITIES.filter(function (c) { return c.toLowerCase().indexOf(ql) === 0; }).slice(0, 7); // starts-with
    if (!matches.length) { close(); return; }
    list.innerHTML = matches.map(function (c, i) { return '<div class="wl-ac-item" data-i="' + i + '">' + c + "</div>"; }).join("");
    list.classList.add("open");
    active = -1;
  }
  function pick(i) { if (matches[i]) { input.value = matches[i]; } close(); }

  input.addEventListener("input", function () {
    var q = input.value.trim();
    if (q.length < 1) { close(); return; }
    render(q);
  });
  input.addEventListener("keydown", function (e) {
    if (!list.classList.contains("open")) return;
    var items = list.querySelectorAll(".wl-ac-item");
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); }
    else if (e.key === "Enter") { if (active >= 0) { e.preventDefault(); pick(active); } return; }
    else if (e.key === "Escape") { close(); return; }
    else return;
    items.forEach(function (el, i) { el.classList.toggle("active", i === active); });
  });
  list.addEventListener("mousedown", function (e) {
    var it = e.target.closest(".wl-ac-item");
    if (it) { e.preventDefault(); pick(+it.getAttribute("data-i")); }
  });
  input.addEventListener("blur", function () { setTimeout(close, 120); });
})();
