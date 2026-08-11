from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


REPORT_DIR = Path(__file__).resolve().parent
OUTPUT = REPORT_DIR / "Betfy66_GSI-407_Implementation_Status.pdf"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")

NAVY = colors.HexColor("#2F5887")
NAVY_DARK = colors.HexColor("#1F3E66")
TEXT = colors.HexColor("#28374A")
MUTED = colors.HexColor("#63748A")
LIGHT_BLUE = colors.HexColor("#EAF4F9")
LIGHTER_BLUE = colors.HexColor("#F5FAFD")
BORDER = colors.HexColor("#B8CAD8")
PASS_BG = colors.HexColor("#D8F1DE")
PASS_FG = colors.HexColor("#237445")
FAIL_BG = colors.HexColor("#FFDCDC")
FAIL_FG = colors.HexColor("#C62828")
RISK_BG = colors.HexColor("#FFE7C2")
RISK_FG = colors.HexColor("#A45B00")
CHECK_BG = colors.HexColor("#FFF7B8")
CHECK_FG = colors.HexColor("#806900")
PARTIAL_BG = colors.HexColor("#DDEBFA")
PARTIAL_FG = colors.HexColor("#245E99")
AFTER_BG = colors.HexColor("#E9E1F6")
AFTER_FG = colors.HexColor("#6848A0")
LOW_BG = colors.HexColor("#D8F1DE")
LOW_FG = colors.HexColor("#237445")
MEDIUM_BG = colors.HexColor("#FFF1B8")
MEDIUM_FG = colors.HexColor("#806000")
HIGH_BG = colors.HexColor("#FFE0BE")
HIGH_FG = colors.HexColor("#A24B00")
VERY_HIGH_BG = colors.HexColor("#FFD3D3")
VERY_HIGH_FG = colors.HexColor("#B21F2D")


pdfmetrics.registerFont(TTFont("ArialUnicode", str(FONT_PATH)))

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "TitleCN",
    parent=styles["Title"],
    fontName="ArialUnicode",
    fontSize=21,
    leading=27,
    textColor=NAVY_DARK,
    alignment=TA_CENTER,
    spaceAfter=4 * mm,
)
subtitle_style = ParagraphStyle(
    "SubtitleCN",
    parent=styles["Normal"],
    fontName="ArialUnicode",
    fontSize=10,
    leading=15,
    textColor=MUTED,
    alignment=TA_CENTER,
)
body_style = ParagraphStyle(
    "BodyCN",
    parent=styles["BodyText"],
    fontName="ArialUnicode",
    fontSize=8.8,
    leading=13.2,
    textColor=TEXT,
    alignment=TA_LEFT,
)
body_small_style = ParagraphStyle(
    "BodySmallCN",
    parent=body_style,
    fontSize=7.7,
    leading=11,
)
body_white_style = ParagraphStyle(
    "BodyWhiteCN",
    parent=body_style,
    textColor=colors.white,
    fontSize=8,
    leading=11,
)
section_style = ParagraphStyle(
    "SectionCN",
    parent=styles["Heading2"],
    fontName="ArialUnicode",
    fontSize=14,
    leading=18,
    textColor=colors.white,
    spaceBefore=3 * mm,
    spaceAfter=0,
)
note_style = ParagraphStyle(
    "NoteCN",
    parent=body_style,
    fontSize=8,
    leading=12,
    textColor=MUTED,
)
callout_style = ParagraphStyle(
    "CalloutCN",
    parent=body_style,
    fontSize=10,
    leading=15,
    textColor=NAVY_DARK,
)


def p(text, style=body_style):
    return Paragraph(text, style)


def section(title):
    return Table(
        [[Paragraph(title, section_style)]],
        colWidths=[180 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ]
        ),
    )


STATUS_STYLE = {
    "PASS": (PASS_BG, PASS_FG, "通過<br/>PASS"),
    "FAIL": (FAIL_BG, FAIL_FG, "未通過<br/>FAIL"),
    "RISK": (RISK_BG, RISK_FG, "有風險<br/>AT RISK"),
    "CHECK": (CHECK_BG, CHECK_FG, "待確認<br/>NEED CHECK"),
    "PARTIAL": (PARTIAL_BG, PARTIAL_FG, "部分通過<br/>PARTIAL"),
    "AFTER": (AFTER_BG, AFTER_FG, "上線後<br/>AFTER RELEASE"),
}

DIFFICULTY_STYLE = {
    "LOW": (LOW_BG, LOW_FG, "低<br/>LOW"),
    "MEDIUM": (MEDIUM_BG, MEDIUM_FG, "中<br/>MEDIUM"),
    "HIGH": (HIGH_BG, HIGH_FG, "高<br/>HIGH"),
    "VERY_HIGH": (VERY_HIGH_BG, VERY_HIGH_FG, "很高<br/>VERY HIGH"),
}


def status_cell(status):
    _, fg, label = STATUS_STYLE[status]
    style = ParagraphStyle(
        f"Status{status}",
        parent=body_small_style,
        alignment=TA_CENTER,
        textColor=fg,
        fontSize=7.5,
        leading=9.5,
    )
    return Paragraph(label, style)


def difficulty_cell(difficulty):
    _, fg, label = DIFFICULTY_STYLE[difficulty]
    style = ParagraphStyle(
        f"Difficulty{difficulty}",
        parent=body_small_style,
        alignment=TA_CENTER,
        textColor=fg,
        fontSize=7.3,
        leading=9.3,
    )
    return Paragraph(label, style)


def status_table(headers, rows, widths, font_size=7.7, status_index=2):
    header = [p(h, body_white_style) for h in headers]
    data = [header]
    for row in rows:
        converted = []
        for idx, cell in enumerate(row):
            if idx == status_index:
                converted.append(status_cell(cell))
            else:
                converted.append(p(cell, body_small_style))
        data.append(converted)

    style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
        ("FONTNAME", (0, 0), (-1, -1), "ArialUnicode"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("REPEATROWS", (0, 0), (-1, 0)),
    ]
    for row_idx in range(1, len(data)):
        style_commands.append(
            ("BACKGROUND", (0, row_idx), (-1, row_idx), LIGHTER_BLUE if row_idx % 2 else LIGHT_BLUE)
        )
        status = rows[row_idx - 1][status_index]
        bg, _, _ = STATUS_STYLE[status]
        style_commands.append(
            ("BACKGROUND", (status_index, row_idx), (status_index, row_idx), bg)
        )

    return Table(
        data,
        colWidths=widths,
        repeatRows=1,
        style=TableStyle(style_commands),
    )


def difficulty_table(headers, rows, widths, status_index=2, difficulty_index=3):
    header = [p(h, body_white_style) for h in headers]
    data = [header]
    for row in rows:
        converted = []
        for idx, cell in enumerate(row):
            if idx == status_index:
                converted.append(status_cell(cell))
            elif idx == difficulty_index:
                converted.append(difficulty_cell(cell))
            else:
                converted.append(p(cell, body_small_style))
        data.append(converted)

    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
        ("FONTNAME", (0, 0), (-1, -1), "ArialUnicode"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.4),
        ("REPEATROWS", (0, 0), (-1, 0)),
    ]
    for row_idx in range(1, len(data)):
        commands.append(
            ("BACKGROUND", (0, row_idx), (-1, row_idx), LIGHTER_BLUE if row_idx % 2 else LIGHT_BLUE)
        )
        status_bg, _, _ = STATUS_STYLE[rows[row_idx - 1][status_index]]
        difficulty_bg, _, _ = DIFFICULTY_STYLE[rows[row_idx - 1][difficulty_index]]
        commands.append(
            ("BACKGROUND", (status_index, row_idx), (status_index, row_idx), status_bg)
        )
        commands.append(
            ("BACKGROUND", (difficulty_index, row_idx), (difficulty_index, row_idx), difficulty_bg)
        )

    return Table(
        data,
        colWidths=widths,
        repeatRows=1,
        style=TableStyle(commands),
    )


def quick_summary(cards):
    data = []
    top = []
    bottom = []
    for title, status in cards:
        _, fg, label = STATUS_STYLE[status]
        top.append(
            Paragraph(
                title,
                ParagraphStyle(
                    f"CardTitle{title}",
                    parent=body_small_style,
                    alignment=TA_CENTER,
                    textColor=TEXT,
                    fontSize=7.2,
                    leading=9,
                ),
            )
        )
        bottom.append(
            Paragraph(
                label.replace("<br/>", " "),
                ParagraphStyle(
                    f"CardStatus{title}",
                    parent=body_small_style,
                    alignment=TA_CENTER,
                    textColor=fg,
                    fontSize=7.2,
                    leading=9,
                ),
            )
        )
    data.extend([top, bottom])
    t = Table(data, colWidths=[36 * mm] * len(cards))
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHTER_BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
    ]
    for idx, (_, status) in enumerate(cards):
        commands.append(("BACKGROUND", (idx, 1), (idx, 1), STATUS_STYLE[status][0]))
    t.setStyle(TableStyle(commands))
    return t


def bullet(text):
    return Paragraph(
        f"• {text}",
        ParagraphStyle(
            f"Bullet{text[:18]}",
            parent=body_style,
            leftIndent=4 * mm,
            firstLineIndent=-3 * mm,
            spaceAfter=1.5 * mm,
        ),
    )


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, 13 * mm, 195 * mm, 13 * mm)
    canvas.setFont("ArialUnicode", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(15 * mm, 8.5 * mm, "Betfy66 GSI-407 - Implementation Review Status")
    canvas.drawRightString(195 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=15 * mm,
    leftMargin=15 * mm,
    topMargin=15 * mm,
    bottomMargin=18 * mm,
    title="Betfy66 GSI-407 Implementation Status",
    author="Internal Development Review",
)

story = [
    Paragraph("Betfy66 GSI-407 實作檢查狀態", title_style),
    Paragraph("AMP / Sitemap 與完整 Technical SEO Checklist 對照報告", subtitle_style),
    Paragraph("檢查日期：2026-07-31　｜　範圍：目前工作分支 diff + 商戶提供的兩份 SEO PDF", subtitle_style),
    Spacer(1, 4 * mm),
    Table(
        [[p("<b>直接結論：</b>目前 AMP 與 sitemap 靜態檔修改大致正確，但只能算部分完成。商戶 PDF 的最高優先項目 - 主站首頁與分類頁 SSR / Prerender - 尚未在目前 diff 中實作。", callout_style)]],
        colWidths=[180 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.8, NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ]
        ),
    ),
    Spacer(1, 5 * mm),
    section("快速摘要"),
    Spacer(1, 2 * mm),
    quick_summary(
        [
            ("AMP 靜態內容", "PASS"),
            ("Sitemap 結構", "PASS"),
            ("主站可爬內容", "FAIL"),
            ("分類頁 SEO", "FAIL"),
            ("正式站驗證", "CHECK"),
        ]
    ),
    Spacer(1, 5 * mm),
    section("1. 需求到底在做什麼"),
    Spacer(1, 2.5 * mm),
    bullet("sitemap.xml 只列出可以讓搜尋引擎索引的 URL；它不會包含 HTML 檔案內容。"),
    bullet("商戶提供的 index (1).html 實際是 AMP HTML，應作為 /amp.html 部署，而不是把 /index.html 加進 sitemap。"),
    bullet("主頁用 rel=\"amphtml\" 指向 /amp.html；AMP 頁再用 canonical 指回 https://betfy66.com/。"),
    bullet("完整 PDF 需求比 sitemap 更大：Google 不執行 JavaScript 時，也要在主站首頁與分類頁的初始 HTML 中直接讀到 Title、Meta、H1 與正文。"),
    Spacer(1, 4 * mm),
    section("2. 判定依據與限制"),
    Spacer(1, 2 * mm),
    status_table(
        ["依據", "本次使用方式", "狀態", "說明"],
        [
            ("Betfy66 Technical SEO Checklist.pdf", "逐頁視覺檢查與文字核對", "PASS", "作為完整需求與目標值來源。"),
            ("Betfy66 Checklist Status.pdf", "逐頁視覺檢查與文字核對", "PASS", "作為 2026-07-27 商戶稽核狀態來源。"),
            ("目前 Git working-tree diff", "檢查 amp.html 與 sitemap.xml", "PASS", "本報告的程式碼判定基準。"),
            ("Jira GSI-407 本文", "只確認到議題標題", "CHECK", "Atlassian 連線及 Chrome 頁面內容讀取逾時；未假裝已核對 Jira 描述。"),
            ("正式環境", "本次未部署、未操作 Search Console", "CHECK", "正式 URL、Googlebot 與索引結果必須上線後驗證。"),
        ],
        [39 * mm, 48 * mm, 25 * mm, 68 * mm],
    ),
    PageBreak(),
    Paragraph("目前 Config Diff - 會過與不會過", title_style),
    Paragraph("此頁只判定目前 whitelabel-frontend-config 分支中的 AMP / sitemap 修改", subtitle_style),
    Spacer(1, 4 * mm),
    section("3. AMP 頁面檢查"),
    Spacer(1, 2 * mm),
    status_table(
        ["No", "檢查項目", "狀態", "原因 / 證據", "通過方式"],
        [
            ("3.1", "AMP Title 使用商戶指定文案", "PASS", "已更新為 Betfy66 - Situs Slot Online & Sportsbook Resmi Terpercaya 2026。", "維持目前內容。"),
            ("3.2", "AMP Meta Description 使用商戶指定文案", "PASS", "已套用商戶提供的首頁 description 與 CTA。", "維持目前內容。"),
            ("3.3", "恰好一個含 Betfy66 的 H1", "PASS", "目前只有一個 H1，且文字含 Betfy66。", "維持目前結構。"),
            ("3.4", "AMP 初始 HTML 有足夠文字", "PASS", "去除 script / style 後約 566 個可見文字詞；內容直接存在 HTML。", "維持靜態內容。"),
            ("3.5", "分類連結 gameType ID", "PASS", "Casino=2、Slot=1、Esport=11、Fishing=8、Lottery=5、Sports=3、Premium=13，符合會員端 enum。", "維持目前數字路徑。"),
            ("3.6", "Promotion 路徑", "PASS", "舊的 /promosi 已改為現有 /promotion。", "維持目前路徑。"),
            ("3.7", "Referral CTA 可供未登入訪客使用", "RISK", "/referral 設有 needAuth；匿名 AMP 訪客會被導走。此項不在商戶 PDF 的明確要求內。", "若本次也要修連結，請商戶確認公開目的地與相符文案。"),
            ("3.8", "AMP canonical", "PASS", "/amp.html 仍 canonical 到 https://betfy66.com/。", "維持目前 canonical。"),
            ("3.9", "Favicon", "PASS", "favicon.ico 仍保留，本次 diff 沒有移除 favicon。", "不需修改。"),
            ("3.10", "官方 AMP 格式驗證", "CHECK", "專案未安裝 amphtml-validator，本次尚未跑官方驗證。", "上線前使用 AMP validator 驗證，修正所有 error。"),
        ],
        [12 * mm, 38 * mm, 23 * mm, 62 * mm, 45 * mm],
    ),
    Spacer(1, 4 * mm),
    section("4. Sitemap 檢查"),
    Spacer(1, 2 * mm),
    status_table(
        ["No", "檢查項目", "狀態", "原因 / 證據", "通過方式"],
        [
            ("4.1", "XML 語法", "PASS", "xmllint --noout 已通過；git diff --check 也通過。", "維持合法 XML。"),
            ("4.2", "語意 gameType 改成數字", "PASS", "現有 router 只接受 /productLobby/:gameType 數字；原語意字串會被導向。", "維持 2、13、3、11、5。"),
            ("4.3", "不放會再次跳轉的分類 URL", "PASS", "Slot=1、Fishing=8 屬 GameOpen，會 replace 到第一個 GameLobby，已排除。", "等會員端有穩定 SEO 落地頁後再加入。"),
            ("4.4", "不放需登入頁", "PASS", "/collaboration 已移除，避免搜尋引擎收錄登入後頁面。", "維持移除。"),
            ("4.5", "Sitemap 包含 Slot / Fishing SEO 分類頁", "PARTIAL", "目前排除是正確的，但商戶完整 checklist 仍期待 Slot 等分類頁可被索引。", "先由會員端建立穩定分類落地頁，再加入 sitemap。"),
            ("4.6", "正式站 sitemap 已更新", "CHECK", "目前只有本地 diff，尚未驗證正式站 https://betfy66.com/sitemap.xml。", "部署後開啟正式 URL，比對內容與 HTTP 200。"),
        ],
        [12 * mm, 43 * mm, 23 * mm, 62 * mm, 40 * mm],
    ),
    PageBreak(),
    Paragraph("完整商戶 SEO Checklist - 差距分析", title_style),
    Paragraph("此頁判定的是整份 PDF，不只目前 AMP / sitemap 靜態檔", subtitle_style),
    Spacer(1, 4 * mm),
    section("5. Rendering & Crawlability - 最高優先"),
    Spacer(1, 2 * mm),
    status_table(
        ["No", "商戶要求", "狀態", "目前原因", "要怎麼通過"],
        [
            ("5.1", "主站首頁初始 HTML 直接包含 H1、段落與清單", "FAIL", "目前 diff 只更新 /amp.html；沒有證據顯示 https://betfy66.com/ 初始 HTML 已加入正文。", "在會員端導入 SSR / Prerender，並用 View Page Source 驗證。"),
            ("5.2", "Googlebot 不執行 JavaScript 也能讀內容", "FAIL", "商戶 2026-07-27 稽核判定 AT RISK；目前 diff 沒有改會員端 rendering。", "以 Google Search Console View crawled page 驗證初始 HTML。"),
            ("5.3", "首頁及重要頁面使用 SSR 或 Prerender", "FAIL", "商戶稽核判定 FAILED；目前 config repo 無法單獨完成。", "在會員端或邊緣層實作每條重要路由的 Prerender。"),
            ("5.4", "主站 noscript fallback", "CHECK", "AMP 有 boilerplate noscript，但主站是否有實際 fallback 尚未驗證。", "檢查主站 source；若不做 SSR，可提供真正可讀的 noscript fallback。"),
        ],
        [12 * mm, 48 * mm, 23 * mm, 57 * mm, 40 * mm],
    ),
    Spacer(1, 4 * mm),
    section("6. Title、Meta 與頁面內容"),
    Spacer(1, 2 * mm),
    status_table(
        ["No", "商戶要求", "狀態", "目前原因", "要怎麼通過"],
        [
            ("6.1", "主站首頁 Title / Meta", "PARTIAL", "指定文案已套用 AMP，但目前 diff 未證明主站首頁的初始 HTML 也使用相同內容。", "讓主站首頁初始 response 輸出指定 Title / Meta。"),
            ("6.2", "每個分類頁唯一 Title", "FAIL", "Slot、Live Casino、Sportsbook 等 per-route title 未在目前 diff 實作。", "依商戶文案為每條穩定分類路由輸出唯一 title。"),
            ("6.3", "每個分類頁唯一 Meta Description", "FAIL", "目前只有 AMP 首頁 description；分類頁沒有 per-route 實作證據。", "依路由輸出唯一 description，含 Betfy66 與 CTA。"),
            ("6.4", "主站首頁恰好一個含 Betfy66 的 H1", "PARTIAL", "AMP 已通過；主站初始 HTML 尚未通過。", "Prerender 主站 H1，確認 source 中只出現一次。"),
            ("6.5", "主站首頁 300-500 字可爬內容", "FAIL", "AMP 有內容，但主站首頁是否直接輸出內容仍未完成。", "把商戶核准的正文放入主站 initial HTML。"),
            ("6.6", "分類頁 200-300 字獨立內容", "FAIL", "目前 diff 沒有任何分類頁正文。", "為 Slot、Casino、Sports 等頁面提供商戶核准的獨立內容。"),
            ("6.7", "主站使用 H2 分段", "CHECK", "AMP 有 8 個 H2；主站 initial HTML 尚未驗證。", "在 Prerender 內容中保留合理 H2 結構。"),
        ],
        [12 * mm, 48 * mm, 23 * mm, 57 * mm, 40 * mm],
    ),
    Spacer(1, 4 * mm),
    section("7. Technical SEO Basics"),
    Spacer(1, 2 * mm),
    status_table(
        ["No", "檢查項目", "狀態", "目前原因", "要怎麼通過"],
        [
            ("7.1", "robots.txt", "PASS", "商戶 2026-07-27 稽核已標示 PASSED；本次未更動。", "維持 Allow 與 Sitemap 宣告。"),
            ("7.2", "Sitemap XML", "PASS", "本地 XML 結構正確，已排除不穩定與需登入路由。", "部署後重新提交 Search Console。"),
            ("7.3", "每頁 self-referencing canonical", "FAIL", "目前靜態 head 主要指向首頁；尚未證明每條分類路由有自己的 canonical。", "由 Prerender / head 管理依 domain 與 route 輸出 canonical。"),
            ("7.4", "重要頁面可索引", "PARTIAL", "商戶稽核確認首頁可索引；分類頁尚未逐一驗證。", "檢查 noindex、HTTP 狀態與 Search Console。"),
            ("7.5", "Mobile / Core Web Vitals", "CHECK", "商戶稽核未量測，本次也不在 config diff 範圍。", "使用 PageSpeed 與 Search Console 實測。"),
            ("7.6", "HTTPS / Mixed Content", "PASS", "商戶稽核標示 PASSED。", "部署後確認無新增 mixed content。"),
        ],
        [12 * mm, 48 * mm, 23 * mm, 57 * mm, 40 * mm],
    ),
    PageBreak(),
    Paragraph("未通過項目難易度", title_style),
    Paragraph("難度代表目前架構下的工程影響，不代表無法完成，也不是正式工期承諾", subtitle_style),
    Spacer(1, 4 * mm),
    section("8. 難度定義"),
    Spacer(1, 2 * mm),
    Table(
        [
            [difficulty_cell("LOW"), p("單一 config、連結修正或驗證工作；不改共用架構。", body_small_style)],
            [difficulty_cell("MEDIUM"), p("數個頁面或模組修改，需要測試，但通常不碰建置與主機。", body_small_style)],
            [difficulty_cell("HIGH"), p("會員端共用程式、router、Head 或站點隔離；具有跨站影響。", body_small_style)],
            [difficulty_cell("VERY_HIGH"), p("Prerender / SSR、CI/CD、部署或靜態主機規則；需跨團隊驗收。", body_small_style)],
        ],
        colWidths=[30 * mm, 150 * mm],
        style=TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
                ("BACKGROUND", (0, 0), (0, 0), LOW_BG),
                ("BACKGROUND", (0, 1), (0, 1), MEDIUM_BG),
                ("BACKGROUND", (0, 2), (0, 2), HIGH_BG),
                ("BACKGROUND", (0, 3), (0, 3), VERY_HIGH_BG),
                ("BACKGROUND", (1, 0), (1, -1), LIGHTER_BLUE),
            ]
        ),
    ),
    Spacer(1, 4 * mm),
    section("8.1 目前 Config Diff 尚未完成"),
    Spacer(1, 2 * mm),
    difficulty_table(
        ["項目", "目前狀態", "難度", "為什麼", "影響 / 前置條件"],
        [
            ("Referral CTA", "RISK", "LOW", "改連結本身容易；真正阻塞是商戶需確認公開目的地與相符文案。", "AMP + PM 決策"),
            ("官方 AMP Validator", "CHECK", "LOW", "只需安裝或在 CI 執行 validator，依錯誤修正。", "Build / CI"),
            ("正式站 AMP / Sitemap 驗證", "CHECK", "LOW", "部署後檢查 HTTP 200、內容與 source；不需改架構。", "需先部署"),
            ("Slot / Fishing 穩定 SEO 落地頁", "PARTIAL", "HIGH", "目前會自動跳供應商頁；需改 okbet 共用路由行為並隔離 BF61。", "會員端 router + 頁面 + sitemap"),
        ],
        [34 * mm, 24 * mm, 22 * mm, 64 * mm, 36 * mm],
        status_index=1,
        difficulty_index=2,
    ),
    Spacer(1, 4 * mm),
    section("8.2 完整 SEO Checklist 未完成"),
    Spacer(1, 2 * mm),
    difficulty_table(
        ["項目", "目前狀態", "難度", "為什麼", "影響 / 前置條件"],
        [
            ("主站首頁初始 HTML 有正文", "FAIL", "HIGH", "需讓 Vue SPA 在 JavaScript 前就有 H1 與正文，不能只改 AMP。", "會員端頁面 + 渲染流程"),
            ("Googlebot 不執行 JS 也能讀", "FAIL", "HIGH", "取決於 Prerender 輸出、API readiness 與正式站驗證。", "Prerender + GSC"),
            ("建立 Prerender / SSR 引擎", "FAIL", "VERY_HIGH", "目前只產 dist/spa；需新增渲染工具、CI/CD、部署與站點隔離。", "會員端 + CI/CD + Hosting"),
            ("主站 noscript fallback", "CHECK", "MEDIUM", "可新增靜態 fallback，但它不能取代完整 Prerender。", "首頁模板"),
            ("主站 Title / Meta 初始輸出", "PARTIAL", "HIGH", "目前指定文案只在 AMP；主站需透過 per-route Head 或 Prerender 輸出。", "Head 管理 + Prerender"),
            ("分類頁唯一 Title / Meta", "FAIL", "HIGH", "需為各穩定路由建立 SEO 設定，且不能污染其他 okbet 站點。", "站點設定 + Head 管理"),
            ("主站 H1 與 300-500 字", "FAIL", "HIGH", "需商戶核准內容、站點隔離與初始 HTML 渲染。", "內容 + 首頁 + Prerender"),
            ("分類頁 200-300 字", "FAIL", "HIGH", "多個分類都要獨立內容，並建立不跳轉的 SEO 頁面。", "內容 + 分類頁"),
            ("每頁 self-canonical", "FAIL", "HIGH", "目前 Head 主要固定首頁；需要依 domain 與 route 動態輸出。", "Head + 多域名策略"),
            ("分類頁可索引驗證", "PARTIAL", "MEDIUM", "技術檢查不難，但需先有穩定頁面並部署。", "HTTP + noindex + GSC"),
            ("Mobile / Core Web Vitals", "CHECK", "MEDIUM", "需要正式站實測；若未達標，修正範圍才會確定。", "PageSpeed + 正式流量"),
            ("多網域 SEO 策略", "CHECK", "HIGH", "若只有 .com canonical 較簡單；若各域名獨立 SEO，需多份 Head、sitemap 與內容策略。", "商戶決策 + 部署"),
            ("Title / Meta 長度衝突", "PARTIAL", "LOW", "程式修改容易，但目前指定原文與長度規則互相衝突。", "SEO / PM 提供最終文案"),
            ("Search Console 重送", "AFTER", "LOW", "程式完成上線後才能操作，技術難度低。", "所有正式修正先上線"),
        ],
        [34 * mm, 24 * mm, 22 * mm, 64 * mm, 36 * mm],
        status_index=1,
        difficulty_index=2,
    ),
    PageBreak(),
    Paragraph("完成路線與決策紀錄", title_style),
    Paragraph("建議用以下順序完成，避免把靜態檔完成誤認為整張 SEO 單完成", subtitle_style),
    Spacer(1, 4 * mm),
    section("9. 建議完成順序"),
    Spacer(1, 2 * mm),
    status_table(
        ["階段", "工作", "目前狀態", "完成條件"],
        [
            ("A", "完成目前 AMP / sitemap diff", "PARTIAL", "跑 AMP validator、部署、確認 /amp.html 與 /sitemap.xml 回傳 200 且內容正確。"),
            ("B", "會員端主站 SSR / Prerender", "FAIL", "首頁與重要分類路由的 View Page Source 直接包含 Title、Meta、canonical、H1 與正文。"),
            ("C", "建立穩定分類 SEO 落地頁", "FAIL", "Slot / Fishing 等重要分類不再自動跳到第一個供應商，並能提供獨立內容。"),
            ("D", "正式站 SEO 驗收", "CHECK", "逐頁檢查 source、HTTP、canonical、noindex、Mobile / CWV。"),
            ("E", "Google Search Console", "AFTER", "重新提交 sitemap，測試 live URL，申請首頁與主要分類重新索引。"),
        ],
        [18 * mm, 54 * mm, 27 * mm, 81 * mm],
    ),
    Spacer(1, 5 * mm),
    section("10. 已確認不需要做的事"),
    Spacer(1, 2 * mm),
    bullet("不要把 index.html 的 HTML 內容放進 sitemap.xml；sitemap 只列 URL。"),
    bullet("不要把 /index.html 或 /amp.html 當成另一個主要 canonical URL 加進 sitemap。"),
    bullet("不要把會自動跳轉的 Slot / Fishing productLobby URL 硬塞回 sitemap。"),
    bullet("不要移除 favicon；商戶 PDF 沒有要求移除，現在也已保留。"),
    bullet("不要自行替每個備用域名複製獨立 SEO，除非商戶確認它們都要各自被索引。"),
    Spacer(1, 4 * mm),
    section("11. 需要商戶 / PM 確認的項目"),
    Spacer(1, 2 * mm),
    status_table(
        ["項目", "目前判定", "原因", "建議決策"],
        [
            ("多網域", "CHECK", "PDF 只指定 betfy66.com，但實際還有 .net、.org 與其他域名。", "目前先把 .com 視為主 canonical；若其他域名要獨立 SEO，再開獨立需求。"),
            ("Referral CTA", "CHECK", "文字是 Bagikan Link，但目的頁需登入。", "若要供匿名訪客使用，確認公開目的地與新文案。"),
            ("Title 長度", "PARTIAL", "指定 Title 為 62 字，但 PDF 同時寫上限 60，來源互相衝突。", "照商戶指定原文；不要自行縮短。"),
            ("Meta 長度", "PARTIAL", "指定 Description 為 173 字，但 PDF 規則寫 140-155，來源互相衝突。", "照商戶指定原文；若 SEO 團隊要求長度，再提供新版文案。"),
        ],
        [38 * mm, 25 * mm, 62 * mm, 55 * mm],
        status_index=1,
    ),
    Spacer(1, 6 * mm),
    Table(
        [[p("<b>最終判定：</b>目前 config diff 可以作為「AMP + sitemap 靜態資產更新」交付；若 Jira 驗收依據是完整 Technical SEO Checklist，則不可標示為全部完成，必須另有會員端 SSR / Prerender 與分類頁 SEO 實作。", callout_style)]],
        colWidths=[180 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
                ("BOX", (0, 0), (-1, -1), 1, NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ]
        ),
    ),
]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUTPUT)
