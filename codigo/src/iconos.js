/* Frutireex · Prototipo bodega V5 — Íconos a color de cada producto (dibujos propios, 48×48). */
(function (root) {
  "use strict";
  const L = ' stroke="#3A2A22" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
  const BRILLO = (x1, y1, y2) => '<path d="M' + x1 + " " + y1 + "V" + y2 + '" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>';

  // frasco transparente con el topping adentro
  function frasco(base, puntos, tapa) {
    const vidrio = "M13 13h22v25a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z";
    return '<rect x="14" y="7" width="20" height="6" rx="2" fill="' + (tapa || "#044E33") + '"' + L + "/>" +
      '<path d="' + vidrio + '" fill="#EEF7FB"' + L + "/>" +
      '<path d="M14.6 21h18.8v17a3 3 0 0 1-3 3H17.6a3 3 0 0 1-3-3z" fill="' + base + '"/>' + puntos +
      '<path d="' + vidrio + '" fill="none"' + L + "/>" + BRILLO(17, 16, 36);
  }
  const pts = (lista, r, color) => lista.map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (Array.isArray(color) ? color[i % color.length] : color) + '"/>').join("");
  const P_ABAJO = [[18, 25], [23, 28], [29, 25], [26, 33], [20, 35], [31, 31], [17, 31], [24, 38], [29, 37], [22, 23]];

  function vaso(arriba, num) {
    return '<path d="M14 ' + arriba + 'h20l-2.6 ' + (42 - arriba) + 'a2 2 0 0 1-2 1.8H18.6a2 2 0 0 1-2-1.8z" fill="#EEF7FB"' + L + "/>" +
      '<path d="M15.6 ' + (arriba + 5) + 'h16.8" stroke="#BFDCEB" stroke-width="1.4"/>' +
      '<path d="M15 ' + arriba + 'a9 8 0 0 1 18 0" fill="#F7FBFD"' + L + "/>" +
      '<path d="M12.5 ' + arriba + 'h23" stroke="#3A2A22" stroke-width="2.2" stroke-linecap="round"/>' +
      '<rect x="23" y="' + (arriba - 9) + '" width="2" height="2.5" fill="#3A2A22"/>' +
      '<text x="24" y="' + (arriba + 16) + '" font-size="9" font-weight="800" text-anchor="middle" fill="#044E33" font-family="Atkinson Hyperlegible Next,Segoe UI,sans-serif">' + num + "</text>";
  }
  function barra(fondo, linea, brillo) {
    return '<rect x="10" y="12" width="28" height="26" rx="3" fill="' + fondo + '"' + L + "/>" +
      '<path d="M19.3 12v26M28.6 12v26M10 20.6h28M10 29.3h28" stroke="' + linea + '" stroke-width="1.6"/>' +
      '<path d="M12.5 15h4.5" stroke="' + brillo + '" stroke-width="1.8" stroke-linecap="round"/>';
  }
  function saco(fondo, extra) {
    return '<path d="M13 16c0-3 22-3 22 0l3 22c0 4.5-28 4.5-28 0z" fill="' + fondo + '"' + L + "/>" +
      '<ellipse cx="24" cy="16" rx="10.5" ry="3.2" fill="#FFFFFF"' + L + "/>" + extra;
  }
  function lata(etiqueta, dibujo) {
    return '<path d="M11 11h26v28c0 2.2-5.8 4-13 4s-13-1.8-13-4z" fill="#D5DADF"' + L + "/>" +
      '<path d="M11 17h26v17H11z" fill="' + etiqueta + '"' + L + "/>" + dibujo +
      '<ellipse cx="24" cy="11" rx="13" ry="4" fill="#EEF1F3"' + L + "/>" +
      '<ellipse cx="24" cy="11" rx="9" ry="2.4" fill="none" stroke="#A9B0B6" stroke-width="1.2"/>';
  }
  const CREMA = "M13 39h22c2.5 0 3.5-2.6 2-4.2-.8-.9-2-1.3-3.2-1.1 1.6-1.6 1.4-4.4-.6-5.4-1.2-.6-2.6-.5-3.6.1.8-2.6-1-5.2-3.8-5.2h-.6c.6-3-1.6-5.7-4.4-5.2.4 2.7-2.3 4-4.4 4.8-2.6 1-3.8 3.4-3 5.6-2.2.2-3.8 2.4-2.8 4.4-1.8.8-2.6 3-1.6 4.6.7 1.4 1.4 1.6 3 1.6z";

  const I = {
    frutilla:
      '<path d="M24 15c-8.5 0-14 4.6-14 11.2C10 34.5 18 42 24 44c6-2 14-9.5 14-17.8C38 19.6 32.5 15 24 15z" fill="#E8344E"' + L + "/>" +
      '<path d="M15.5 22c-1.6 3-1.6 6.6 0 9.6" stroke="#FF8A9B" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      pts([[19.5, 24], [24.5, 22.5], [29.5, 24.5], [21.5, 30], [27, 30], [24, 36.5], [31.5, 30.5]], 1.1, "#FFE29A") +
      '<path d="M24 17c-3-4-8-5-11-3 3 1 5 3 6 5-3 0-6 1-7 3 4 1 8 0 12-2 4 2 8 3 12 2-1-2-4-3-7-3 1-2 3-4 6-5-3-2-8-1-11 3z" fill="#43A047"' + L + "/>" +
      '<path d="M24 16V9" stroke="#2E7D32" stroke-width="2.4" stroke-linecap="round"/>',
    durazno: lata("#F59B3D", '<circle cx="24" cy="25.5" r="6" fill="#FFC680" stroke="#C2571A" stroke-width="1.4"/><path d="M24 19.6c1.4-2 4-2.6 5.6-1.6-1 2-3.6 2.6-5.6 1.6z" fill="#43A047"/><path d="M21 23.5a3.5 3.5 0 0 1 3-1.8" stroke="#FFFFFF" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
    banano:
      '<path d="M9 13c1 13 10 23 26 23 3 0 3-3 1-4-12-1-19-9-21-20-.6-2.6-6-2.6-6 1z" fill="#F4C430"' + L + "/>" +
      '<path d="M15 10c2 11 9 18 22 18 2.6 0 2.8-2.8.8-3.6-10-1.2-15.6-7.4-17.4-15.4-.6-2.4-5.6-2.2-5.4 1z" fill="#FFDE59"' + L + "/>" +
      '<path d="M11 13l-1.5-4.5L14 9" fill="#6B4E12" stroke="#6B4E12" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M36 33.6l3 .4M37.6 27.2l2.6.2" stroke="#3A2A22" stroke-width="2" stroke-linecap="round"/>',
    chantilly:
      '<path d="' + CREMA + '" fill="#FFFDF7"' + L + "/>" +
      '<path d="M17 33c3 1.5 9 1.5 14 0M19 27.5c2.5 1.3 7 1.3 10 0" stroke="#D9CBB4" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    leche:
      '<path d="M16 15l4-6h8l4 6v27H16z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M16.8 27c3-2 6 1 7.2 0s4.2-2 7.2 0v14.2H16.8z" fill="#5AA7E0"/>' +
      '<path d="M16 15l4-6h8l4 6v27H16zM16 15h16" fill="none"' + L + "/>" +
      '<rect x="21" y="5" width="6" height="4" rx="1" fill="#2F6FB0"' + L + "/>",
    leche_polvo:
      '<rect x="13" y="13" width="22" height="29" rx="3" fill="#FFFFFF"' + L + "/>" +
      '<rect x="13" y="22" width="22" height="11" fill="#8FC6EE"' + L + "/>" +
      '<circle cx="24" cy="27.5" r="3" fill="#FFFFFF"/>' +
      '<rect x="12" y="9" width="24" height="5" rx="2" fill="#2F6FB0"' + L + "/>",
    condensada: lata("#3E7CC4", '<path d="M17 25.5h14" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><path d="M20 29.5h8" stroke="#BFE0FF" stroke-width="1.8" stroke-linecap="round"/>'),
    azucar_imp: saco("#F7F1E6", '<path d="M18 28h12" stroke="#E7A3C5" stroke-width="3.4" stroke-linecap="round"/><g fill="#FFFFFF" stroke="#C9BBA3" stroke-width=".8"><circle cx="32" cy="8" r="1.5"/><circle cx="36" cy="11.5" r="1.1"/><circle cx="16" cy="9" r="1.2"/></g>'),
    azucar: saco("#E9D8B4", '<path d="M17 26h14M18 31h12" stroke="#B8975F" stroke-width="1.8" stroke-linecap="round"/>'),
    vainilla:
      '<rect x="18" y="8" width="12" height="6" rx="1.5" fill="#3A2A22"/>' +
      '<path d="M17 14h14l2 5v20a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V19z" fill="#8B5A2B"' + L + "/>" +
      '<rect x="17" y="24" width="14" height="10" rx="1.5" fill="#F3E3C2"' + L + "/>" +
      '<path d="M20.5 29c2-2.2 4.4 2.2 7 0" stroke="#5B3A1C" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    huevos:
      '<ellipse cx="19" cy="29" rx="8.5" ry="11" fill="#FFF7E8"' + L + "/>" +
      '<ellipse cx="30" cy="27" rx="8.5" ry="11" fill="#F3DDBD"' + L + "/>" +
      '<path d="M27 21c1-2 3-3 4.5-3" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
    crema_reex:
      '<path d="M11 24h26l-3 16a3 3 0 0 1-3 2.5H17a3 3 0 0 1-3-2.5z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M12.4 29h23.2" stroke="#044E33" stroke-width="2.6"/>' +
      '<path d="M12 24c0-3 3-4 5-4 0-3 3-5 6-4 1-3 6-3 7 0 3-1 6 1 6 4 0 0 0 4-1 4H13c-1 0-1-4-1-4z" fill="#FFB3D6"' + L + "/>" +
      '<path d="M18 21c2 1 4 1 6 0" stroke="#FFFFFF" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    dulce_fresa:
      '<rect x="14" y="8" width="20" height="6" rx="2" fill="#E8344E"' + L + "/>" +
      '<path d="M13 14h22v24a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="#EEF7FB"' + L + "/>" +
      '<path d="M14.6 21h18.8v17a3 3 0 0 1-3 3H17.6a3 3 0 0 1-3-3z" fill="#C81D3A"/>' +
      pts([[20, 27], [27, 30], [23, 35]], 1, "#FF7A8C") +
      '<path d="M13 14h22v24a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill="none"' + L + "/>" + BRILLO(17, 17, 36),
    choco_negro: barra("#6B3A1F", "#4A2612", "#9A6440"),
    choco_blanco: barra("#F3E6C8", "#D8C49A", "#FFFFFF"),
    oreo: frasco("#3B2A2A", pts(P_ABAJO, 1.4, "#F4EFE6")),
    grageas: frasco("#FFF6F9", pts(P_ABAJO, 1.8, ["#E53935", "#FBC02D", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA"])),
    masmelos: frasco("#FCE4EF", [[16.5, 23], [23, 26], [28.5, 22.5], [19, 31], [26, 32], [17, 36.5], [29, 36]].map(([x, y], i) => '<rect x="' + x + '" y="' + y + '" width="4" height="4" rx="1" fill="' + (i % 2 ? "#FFFFFF" : "#F8BBD9") + '" stroke="#D7A8BE" stroke-width=".6"/>').join("")),
    coco: frasco("#FFFFFF", [[17, 25], [24, 27], [29, 24], [20, 32], [27, 33], [18, 37], [30, 37]].map(([x, y]) => '<path d="M' + x + " " + y + 'l3 -1" stroke="#C9C2B4" stroke-width="1.3" stroke-linecap="round"/>').join("")),
    mani: frasco("#E8C48A", [[18, 25], [24, 28], [29, 24.5], [21, 33], [28, 33], [18, 38], [30, 38]].map(([x, y]) => '<ellipse cx="' + x + '" cy="' + y + '" rx="2" ry="1.4" fill="#B97E3A"/>').join("")),
    nuez: frasco("#B88452", [[18, 25], [25, 27.5], [29.5, 24], [21, 33], [28.5, 33], [18, 38], [29, 38]].map(([x, y]) => '<path d="M' + x + " " + y + 'c1-2 3-2 4 0-1 2-3 2-4 0z" fill="#7A4A22"/>').join("")),
    granola: frasco("#E2B464", pts(P_ABAJO, 1.7, ["#B8803A", "#8E5C25", "#F2D08A"])),
    tajin:
      '<rect x="16" y="7" width="16" height="7" rx="2" fill="#E53935"' + L + "/>" +
      pts([[21, 10.5], [24, 10.5], [27, 10.5]], 0.9, "#3A2A22") +
      '<path d="M15 14h18v25a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z" fill="#EEF7FB"' + L + "/>" +
      '<path d="M16 24h16v15a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill="#E4572E"/>' +
      pts([[20, 30], [26, 33], [23, 37], [28, 28]], 1, "#B0281A") +
      '<path d="M15 14h18v25a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z" fill="none"' + L + "/>" + BRILLO(18, 17, 36),
    chamoy:
      '<rect x="20" y="5" width="8" height="5" rx="1" fill="#2E7D32"' + L + "/>" +
      '<path d="M20 10h8v5l4 5v19a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V20l4-5z" fill="#A3122A"' + L + "/>" +
      '<rect x="17" y="25" width="14" height="9" rx="1.5" fill="#FFD54F"' + L + "/>" +
      '<path d="M19 15v22" stroke="#FF8A9B" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>',
    gusanitos: [["#66BB6A", 15], ["#FFCA28", 25], ["#EF5350", 35]].map(([c, y]) => {
      const d = "M9 " + y + "c4-4 8 4 12 0s8 4 12 0 6 2 6 2";
      return '<path d="' + d + '" stroke="#3A2A22" stroke-width="7" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="' + c + '" stroke-width="4.4" fill="none" stroke-linecap="round"/>';
    }).join(""),
    vaso9: vaso(21, "10"),
    vaso12: vaso(17, "12"),
    tapa:
      '<path d="M10 32a14 13 0 0 1 28 0z" fill="#F2F9FC"' + L + "/>" +
      '<path d="M8 32h32v3.5H8z" fill="#DDEEF6"' + L + "/>" +
      '<path d="M15.5 27c1.6-3.6 4.6-6 8.5-6.4" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<rect x="22.5" y="17" width="3" height="3" rx=".5" fill="#3A2A22"/>',
    bandeja:
      '<path d="M6 25l6 11h24l6-11z" fill="#E7B84A"' + L + "/>" +
      '<path d="M11 25l4 8M19 25l2 8M29 25l-2 8M37 25l-4 8" stroke="#B88A22" stroke-width="1.3"/>' +
      '<path d="M6 25h36" stroke="#3A2A22" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="' + "M17 24c0-3 2-4 3.6-4 .4-2.4 2.4-3.6 4.4-3 1-1.6 4-1.4 4.6.6 2 .2 3.4 1.8 3.4 3.6v2.8z" + '" fill="#FFB3D6"' + L + "/>",
    tenedor:
      '<ellipse cx="24" cy="13.5" rx="6.5" ry="8.5" fill="#D8A866"' + L + "/>" +
      '<path d="M22.4 21.6h3.2V41a1.6 1.6 0 0 1-3.2 0z" fill="#D8A866"' + L + "/>" +
      '<ellipse cx="22.2" cy="11.5" rx="2.2" ry="3.6" fill="#EDCB97"/>' +
      '<path d="M30 30l6-8 3 2-5 9z" fill="#FFFFFF"' + L + "/>",
    servilleta:
      '<path d="M8 31l16-8 16 8-16 8z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M8 25.5l16-8 16 8-16 8z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M8 20l16-8 16 8-16 8z" fill="#FFF3F8"' + L + "/>" +
      '<path d="M17.5 20l6.5 3.2 6.5-3.2" stroke="#F3A5C8" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    funda_delivery:
      '<path d="M12 17h24l2 25H10z" fill="#C89B62"' + L + "/>" +
      '<path d="M18 17v-3a6 6 0 0 1 12 0v3" fill="none" stroke="#3A2A22" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="24" cy="30" r="5.2" fill="#044E33"/><path d="M21.4 30h5.2" stroke="#CEE85D" stroke-width="1.9" stroke-linecap="round"/>',
    choco_derretido:
      '<path d="M9 22h30v12a8 8 0 0 1-8 8H17a8 8 0 0 1-8-8z" fill="#B9C0C6"' + L + "/>" +
      '<ellipse cx="24" cy="22" rx="15" ry="4" fill="#6B3A1F"' + L + "/>" +
      '<path d="M5 24.5h4M39 24.5h4" stroke="#3A2A22" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M18 16c-1.6-2 1.6-3 0-5.2M24 15c-1.6-2 1.6-3 0-5.2M30 16c-1.6-2 1.6-3 0-5.2" stroke="#9A6440" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
      '<path d="M14.5 21.5c3 .9 6 .9 8.5 0" stroke="#9A6440" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M13 28v8" stroke="#E3E7EA" stroke-width="2" stroke-linecap="round"/>',
    tarro_godzilla:
      '<rect x="8" y="11" width="32" height="7" rx="2" fill="#044E33"' + L + "/>" +
      '<path d="M9 18h30l-2.5 21a3 3 0 0 1-3 2.6H14.5a3 3 0 0 1-3-2.6z" fill="#EEF7FB"' + L + "/>" +
      '<path d="M13.5 22v14" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>' +
      '<text x="25.5" y="35" font-size="11" font-weight="800" text-anchor="middle" fill="#044E33" font-family="Atkinson Hyperlegible Next,Segoe UI,sans-serif">G</text>',
    mora:
      [[19, 22], [25, 21], [31, 23], [16, 28], [22, 28], [28, 28], [34, 29], [19, 34], [25, 34], [31, 34], [24, 39.5]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="#4A1942"' + L + '/><circle cx="' + (x - 1) + '" cy="' + (y - 1.2) + '" r="1" fill="#B76BA3"/>').join("") +
      '<path d="M25 18c-1-4 1-7 5-8M25 18c-3-2-7-2-9 0" stroke="#2E7D32" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    domo_mini:
      '<path d="M12 30l4 7h16l4-7z" fill="#E7B84A"' + L + "/>" +
      '<path d="M15 30a9 8 0 0 1 18 0z" fill="#EAF6FB"' + L + "/>" +
      '<path d="M18.5 27c1-2 2.6-3.2 4.6-3.6" stroke="#FFFFFF" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<path d="M12 30h24" stroke="#3A2A22" stroke-width="1.8" stroke-linecap="round"/>',
    tenedor_blanco:
      '<path d="M18 7v9a6 6 0 0 0 12 0V7" fill="none" stroke="#3A2A22" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M22 7v8M26 7v8" stroke="#3A2A22" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M18 7v9a6 6 0 0 0 12 0V7M22 7v8M26 7v8" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M22.4 21.5h3.2V41a1.6 1.6 0 0 1-3.2 0z" fill="#FFFFFF"' + L + "/>",
    funda_tenedor:
      '<path d="M15 9h18v31a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2z" fill="#EEF7FB"' + L + "/>" +
      '<path d="M15 14h18" stroke="#9BC7DD" stroke-width="2" stroke-dasharray="2 2"/>' +
      '<path d="M24 19v17" stroke="#D8A866" stroke-width="3" stroke-linecap="round"/><path d="M21.5 18.5v4a2.5 2.5 0 0 0 5 0v-4" fill="none" stroke="#D8A866" stroke-width="1.8" stroke-linecap="round"/>',
    funda_deliv_peq:
      '<path d="M16 21h16l1.5 19h-19z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M20 21v-2.5a4 4 0 0 1 8 0V21" fill="none" stroke="#3A2A22" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="24" cy="31" r="3.4" fill="#044E33"/>',
    funda_deliv_med:
      '<path d="M13 17h22l2 24H11z" fill="#FFFFFF"' + L + "/>" +
      '<path d="M18.5 17v-3a5.5 5.5 0 0 1 11 0v3" fill="none" stroke="#3A2A22" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="24" cy="29.5" r="4.6" fill="#044E33"/><path d="M21.8 29.5h4.4" stroke="#CEE85D" stroke-width="1.7" stroke-linecap="round"/>',
    masking:
      '<circle cx="24" cy="26" r="14" fill="#F1E3B5"' + L + "/>" +
      '<circle cx="24" cy="26" r="6.5" fill="#FFFDF7"' + L + "/>" +
      '<path d="M37.6 29.5l5 9.5-9 1.5z" fill="#F1E3B5"' + L + "/>",
    rollo_impresora:
      '<path d="M12 18h20v20H12z" fill="#FFFFFF"' + L + "/>" +
      '<ellipse cx="32" cy="28" rx="5" ry="10" fill="#F4F4F0"' + L + "/>" +
      '<ellipse cx="32" cy="28" rx="1.8" ry="3.6" fill="#9AA5A0"/>' +
      '<path d="M15 24h12M15 28h9M15 32h11" stroke="#B9C2BE" stroke-width="1.4" stroke-linecap="round"/>',
    trapos:
      '<path d="M9 33l15-6 15 6-15 6z" fill="#4FA3E0"' + L + "/>" +
      '<path d="M9 27l15-6 15 6-15 6z" fill="#F9D44A"' + L + "/>" +
      '<path d="M9 21l15-6 15 6-15 6z" fill="#E86A8E"' + L + "/>",
    funda_basura_g:
      '<path d="M14 15c3 3 17 3 20 0l3 25a3 3 0 0 1-3 2.6H14a3 3 0 0 1-3-2.6z" fill="#2B2F2D"' + L + "/>" +
      '<path d="M20 13l4 3 4-3-1 4h-6z" fill="#2B2F2D"' + L + "/>" +
      '<path d="M16 22c1 6 1 11 0 16" stroke="#5E6662" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    funda_basura_p:
      '<path d="M17 20c2.4 2.4 11.6 2.4 14 0l2 19a2.6 2.6 0 0 1-2.6 2.4H17.6A2.6 2.6 0 0 1 15 39z" fill="#2B2F2D"' + L + "/>" +
      '<path d="M21.5 18l2.5 2 2.5-2-.8 3h-3.4z" fill="#2B2F2D"' + L + "/>",
    cloro:
      '<path d="M14 15h16l5 6v18a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V18z" fill="#FFFFFF"' + L + "/>" +
      '<rect x="15" y="9" width="7" height="6" rx="1" fill="#1E88E5"' + L + "/>" +
      '<path d="M26 15v-3h5a3 3 0 0 1 3 3v5" fill="none" stroke="#3A2A22" stroke-width="1.8"/>' +
      '<rect x="15" y="25" width="17" height="9" rx="1.5" fill="#BFE3F7"' + L + "/>",
    caja:
      '<path d="M8 17l16-7 16 7v18l-16 7-16-7z" fill="#C8955A"' + L + "/>" +
      '<path d="M8 17l16 7 16-7M24 24v18" fill="none"' + L + "/>" +
      '<path d="M16 13.5l16 7v5" stroke="#E8C38E" stroke-width="2" fill="none"/>'
  };
  function icono(id, clase) {
    return '<svg class="' + (clase || "ico") + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + (I[id] || I.caja) + "</svg>";
  }
  root.FRX_ICONOS = { icono, ICONOS: I };
})(typeof window !== "undefined" ? window : globalThis);
