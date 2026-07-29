#!/usr/bin/env python3
"""Build Offerte_Template_V13.docx from V12.

V13 adds the optional EMG (Erschuetterungsmessung) blocks. Never edit the
template in Word -- always via this kind of script (see CLAUDE.md).

Changes vs V12:
  1. Subject line: "Offerte fuer Beweissicherung" -> "Offerte fuer {{OFFERT_TITEL}}"
  2. Ausgangslage tail -> {{AUSGANGSLAGE_ZIEL}}
  3. {{BS_START}}/{{BS_END}} markers around chapter "Leistungen Beweissicherung"
     (incl. Koordination/Erstaufnahme/VA/Dokumentation) for EMG-only removal
  4. EMG-Leistungen chapter between {{EMG_START}}/{{EMG_END}} (after BS block)
  5. Literal "3.1" of the KOSTEN section -> {{NR_KOSTEN}}
  6. {{BSK_START}}/{{BSK_END}} markers around the BS cost section (3.1 + table)
  7. EMG cost section between {{EMGK_START}}/{{EMGK_END}} (after BS cost table)
  8. Termine texts -> {{TERMINE_SATZ1}} / {{TERMINE_OBJEKT}}
  9. Ueberschrift-2-Titel: Abstand "Vor" generell 0 statt 24 Pt direkt bzw.
     10 Pt im Style (Feedback BPa 2026-07-29, wirkt auf alle Offertarten)

All markers are hidden (<w:vanish/>) paragraphs, same pattern as {{VA_START}}.
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "Offerte_Template_V12.docx"
DST = ROOT / "public" / "Offerte_Template_V13.docx"

CB = (
    '<w:sdt><w:sdtPr>{rpr}<w:id w:val="{id}"/><w14:checkbox>'
    '<w14:checked w14:val="0"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/>'
    '<w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr>'
    '<w:sdtEndPr/><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" '
    'w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/>{rfonts_extra}</w:rPr>'
    '<w:t>☐</w:t></w:r></w:sdtContent></w:sdt>'
)


def cb(sdt_id: int, east_asia_lang: bool = False) -> str:
    rpr = '<w:rPr><w:lang w:eastAsia="de-CH"/></w:rPr>' if east_asia_lang else ''
    extra = '<w:lang w:eastAsia="de-CH"/>' if east_asia_lang else ''
    return CB.format(rpr=rpr, id=sdt_id, rfonts_extra=extra)


def marker_para(para_id: str, placeholder: str) -> str:
    return (
        f'<w:p w14:paraId="{para_id}" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441"><w:pPr><w:rPr><w:vanish/></w:rPr></w:pPr>'
        f'<w:r><w:rPr><w:vanish/></w:rPr><w:t>{placeholder}</w:t></w:r></w:p>'
    )


# Absatz-Bausteine (Formatierung 1:1 aus der manuell ergaenzten Muster-Offerte
# 51.26.392 "mit EMG" uebernommen)
PPR_CB_LINE = (
    '<w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
    '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
    '<w:tabs><w:tab w:val="left" w:pos="4678"/><w:tab w:val="left" w:pos="7797"/></w:tabs>'
    '<w:spacing w:after="60"/><w:ind w:left="567"/></w:pPr>'
)
PPR_BULLET = (
    '<w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
    '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="15"/></w:numPr>'
    '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>'
    '<w:spacing w:before="120" w:after="60"/><w:rPr><w:i/></w:rPr></w:pPr>'
)


def bullet(para_id: str, text: str) -> str:
    return (
        f'<w:p w14:paraId="{para_id}" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_BULLET}'
        f'<w:r><w:rPr><w:i/></w:rPr><w:t>{text}</w:t></w:r></w:p>'
    )


def leer_para(para_id: str, ind: bool = False) -> str:
    ind_xml = '<w:ind w:left="567"/>' if ind else ''
    return (
        f'<w:p w14:paraId="{para_id}" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441"><w:pPr><w:spacing w:line="240" w:lineRule="auto"/>'
        f'{ind_xml}<w:jc w:val="left"/><w:rPr><w:noProof/></w:rPr></w:pPr></w:p>'
    )


def cb_line(para_id: str, inner: str) -> str:
    return (
        f'<w:p w14:paraId="{para_id}" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_CB_LINE}{inner}</w:p>'
    )


def build_emg_leistungen_block() -> str:
    p = []
    # Seitenumbruch-Absatz: {{EMG_PB}} wird vom Generator geleert (BS+EMG) oder
    # der ganze Absatz entfernt (nur EMG)
    p.append(
        '<w:p w14:paraId="0B000001" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:spacing w:line="240" w:lineRule="auto"/>'
        '<w:jc w:val="left"/><w:rPr><w:lang w:eastAsia="de-CH"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:vanish/></w:rPr><w:t>{{EMG_PB}}</w:t></w:r>'
        '<w:r><w:rPr><w:lang w:eastAsia="de-CH"/></w:rPr><w:br w:type="page"/></w:r></w:p>'
    )
    # Kapitel-Ueberschrift (auto-nummeriert via berschrift2)
    p.append(
        '<w:p w14:paraId="0B000002" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="berschrift2"/>'
        '<w:keepLines w:val="0"/><w:tabs><w:tab w:val="num" w:pos="-2055"/>'
        '<w:tab w:val="num" w:pos="641"/></w:tabs><w:spacing w:before="480" w:after="120"/>'
        '<w:ind w:left="567" w:hanging="567"/><w:rPr><w:caps/><w:sz w:val="22"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:caps/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Leistungen Erschütterungsmessung</w:t></w:r></w:p>'
    )
    p.append(
        '<w:p w14:paraId="0B000003" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr><w:spacing w:after="60"/>'
        '<w:ind w:left="567"/></w:pPr>'
        '<w:r><w:t xml:space="preserve">Folgende Leistungen werden im Rahmen der '
        'Erschütterungsmessung durch die </w:t></w:r>'
        '<w:r><w:br/><w:t>HMQ erbracht:</w:t></w:r></w:p>'
    )
    p.append('<w:p w14:paraId="0B000004" w14:textId="77777777" w:rsidR="00996441" w:rsidRDefault="00996441"/>')
    # Unterkapitel {{NR_EMG}} Erschuetterungsmessungen
    p.append(
        '<w:p w14:paraId="0B000005" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/><w:ind w:left="567" w:hanging="567"/>'
        '<w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:b/></w:rPr><w:t>{{NR_EMG}}</w:t></w:r>'
        '<w:r><w:rPr><w:b/></w:rPr><w:tab/><w:t>Erschütterungsmessungen</w:t></w:r></w:p>'
    )
    p.append(
        '<w:p w14:paraId="0B000006" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/><w:ind w:left="567" w:hanging="567"/></w:pPr>'
        '<w:r><w:rPr><w:b/></w:rPr><w:tab/></w:r>'
        '<w:r><w:t>Dabei werden folgende Arbeiten ausgeführt:</w:t></w:r></w:p>'
    )
    # Checkbox-Zeilen (8 Checkboxen in 8 Absaetzen, alle ungesetzt).
    # SMS-Alarmierung auf eigener Zeile direkt unter der Konfiguration
    # (Feedback BPa 2026-07-29; Reihenfolge der Checkboxen bleibt unveraendert)
    p.append(cb_line(
        '0B000007',
        cb(510000001, east_asia_lang=True)
        + '<w:r><w:rPr><w:lang w:eastAsia="de-CH"/></w:rPr>'
        '<w:t xml:space="preserve"> Konfiguration/Bereitstellung von </w:t></w:r>'
        '<w:r><w:rPr><w:b/><w:bCs/><w:lang w:eastAsia="de-CH"/></w:rPr>'
        '<w:t>{{EMG_GEOPHONE}}</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B000030',
        cb(510000002)
        + '<w:r><w:t xml:space="preserve"> inkl. SMS-Alarmierung/Web-Zugriff</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B000008',
        cb(510000003) + '<w:r><w:t xml:space="preserve"> Terminvereinbarung mit den Eigentümern</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B000009',
        cb(510000004) + '<w:r><w:t xml:space="preserve"> Erstinstallation mit Testmessung</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B00000A',
        cb(510000005) + '<w:r><w:t xml:space="preserve"> Vorhalten für {{EMG_VORHALTEN_WOCHEN}}</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B00000B',
        cb(510000006) + '<w:r><w:t xml:space="preserve"> Deinstallation</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B00000C',
        cb(510000007) + '<w:r><w:t xml:space="preserve"> Abschlussbericht (optional)</w:t></w:r>'
    ))
    p.append(cb_line(
        '0B00000D',
        # exakt wie Muster-Offerte: 8x U+2026 plus Punkt
        cb(510000008) + '<w:r><w:t xml:space="preserve"> …………………….</w:t></w:r>'
    ))
    # Voraussetzung
    p.append(
        '<w:p w14:paraId="0B00000E" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/><w:ind w:left="567"/>'
        '<w:rPr><w:i/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:i/></w:rPr><w:t>Voraussetzung:</w:t></w:r></w:p>'
    )
    p.append(bullet('0B00000F', 'Strom wird kostenlos zur Verfügung gestellt'))
    p.append(bullet('0B000010', 'Interventionen infolge Einwirkung Dritter werden in Regie in Rechnung gestellt.'))
    p.append(bullet('0B000011', 'Die Grenzwerte und die zu alarmierenden Personen werden vor Installation festgelegt.'))
    # Wird bei "nur EMG" vom Generator entfernt (Absatz-Match ueber den Text)
    p.append(bullet('0B000012', 'Installation erfolgt zeitgleich mit der Aufnahme der Rissprotokolle.'))
    p.append(leer_para('0B000013'))
    p.append(
        '<w:p w14:paraId="0B000014" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:spacing w:line="240" w:lineRule="auto"/>'
        '<w:ind w:left="567"/><w:jc w:val="left"/><w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:i/><w:noProof/></w:rPr><w:t>Folgendes gilt es zu beachten</w:t></w:r>'
        '<w:r><w:rPr><w:b/></w:rPr><w:t>:</w:t></w:r></w:p>'
    )
    p.append(bullet('0B000015', 'Die HMQ AG stellt sicher, dass die Geräte in Betrieb sind und korrekt funktionieren.'))
    p.append(bullet('0B000016', 'Die HMQ AG misst die Erschütterungseinwirkungen mit den aufgestellten Geophonen.'))
    p.append(bullet('0B000017', 'Die Beurteilung der Erschütterungseinwirkungen wird nicht von der HMQ AG gemacht.'))
    p.append(bullet('0B000018', 'Die HMQ AG stellt die Alarmierung sicher –&gt; Versand SMS nach Überschreiten der Grenzwerte.'))
    p.append(bullet('0B000019', 'Die Überwachung der Einhaltung der Grenzwerte erfolgt nicht über die HMQ AG.'))
    p.append(bullet('0B00001A', 'Die HMQ AG interveniert nicht bei einer Überschreitung der Grenzwerte.'))
    # Roter Hinweis wie in der Muster-Offerte
    p.append(
        '<w:p w14:paraId="0B00001B" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="15"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/>'
        '<w:rPr><w:b/><w:bCs/><w:i/><w:color w:val="EE0000"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:b/><w:bCs/><w:i/><w:color w:val="EE0000"/></w:rPr>'
        '<w:t>Die Deinstallation muss durch den Auftraggeber erteilt werden und erfolgt '
        'nicht automatisch nach Vollendung der offerierten Messdauer</w:t></w:r></w:p>'
    )
    p.append(leer_para('0B00001C', ind=True))
    p.append(
        '<w:p w14:paraId="0B00001D" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:spacing w:line="240" w:lineRule="auto"/>'
        '<w:ind w:left="567"/><w:jc w:val="left"/><w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:i/><w:noProof/></w:rPr><w:t>Wochentarife</w:t></w:r></w:p>'
    )
    # Marker-Absatz: Generator ersetzt ihn durch die 4 Tarifzeilen
    # (aktives Band fett, Werte aus dem Admin). Bewusst KEIN Leerabsatz danach:
    # ein nachlaufender Leerabsatz kann auf eine Folgeseite rutschen und zusammen
    # mit dem KOSTEN-Umbruch eine komplett leere Seite erzeugen (Feedback BPa)
    p.append(marker_para('0B00001E', '{{EMG_TARIFE}}'))
    return marker_para('0B000000', '{{EMG_START}}') + ''.join(p) + marker_para('0B000020', '{{EMG_END}}')


# EMG-Kostentabelle: Zellen-/Rahmenaufbau identisch zur BS-Kostentabelle
TC_LABEL_START = (
    '<w:tc><w:tcPr><w:tcW w:w="6521" w:type="dxa"/><w:tcBorders>'
    '<w:top w:val="single" w:sz="{top}" w:space="0" w:color="auto"/>'
    '<w:bottom w:val="single" w:sz="{bottom}" w:space="0" w:color="auto"/>'
    '</w:tcBorders></w:tcPr>'
)
TC_PREIS_START = (
    '<w:tc><w:tcPr><w:tcW w:w="1843" w:type="dxa"/><w:tcBorders>'
    '<w:top w:val="single" w:sz="{top}" w:space="0" w:color="auto"/>'
    '<w:bottom w:val="single" w:sz="{bottom}" w:space="0" w:color="auto"/>'
    '</w:tcBorders>{valign}</w:tcPr>'
)
PPR_LABEL = (
    '<w:pPr><w:pStyle w:val="Kopfzeile"/><w:tabs><w:tab w:val="clear" w:pos="4536"/>'
    '<w:tab w:val="clear" w:pos="9072"/></w:tabs><w:spacing w:before="20" w:after="20"/>'
    '<w:ind w:left="914" w:hanging="914"/><w:rPr><w:bCs/></w:rPr></w:pPr>'
)
PPR_PREIS = (
    '<w:pPr><w:spacing w:before="20" w:after="20"/><w:ind w:right="412"/>'
    '<w:jc w:val="right"/><w:rPr><w:bCs/></w:rPr></w:pPr>'
)


def kosten_row(pid1, pid2, label_paras, preis_run, top='4', bottom='4',
               valign=False, bold=False):
    valign_xml = '<w:vAlign w:val="center"/>' if valign else ''
    rpr = '<w:rPr><w:b/></w:rPr>' if bold else '<w:rPr><w:bCs/></w:rPr>'
    return (
        '<w:tr w:rsidR="00996441">'
        + TC_LABEL_START.format(top=top, bottom=bottom)
        + label_paras
        + '</w:tc>'
        + TC_PREIS_START.format(top=top, bottom=bottom, valign=valign_xml)
        + f'<w:p w14:paraId="{pid2}" w14:textId="77777777" w:rsidR="00996441" '
          f'w:rsidRDefault="00996441">{PPR_PREIS}'
          f'<w:r>{rpr}<w:t>{preis_run}</w:t></w:r></w:p>'
        + '</w:tc></w:tr>'
    )


def label_para(pid, text, bold=False):
    rpr = '<w:rPr><w:b/></w:rPr>' if bold else '<w:rPr><w:bCs/></w:rPr>'
    return (
        f'<w:p w14:paraId="{pid}" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_LABEL}<w:r>{rpr}<w:t>{text}</w:t></w:r></w:p>'
    )


def build_emg_kosten_block() -> str:
    p = []
    # Abstand + Unterkapitel {{NR_EMGK}} Erschuetterungsmessung.
    # Der Abstandsabsatz traegt einen versteckten Marker: bei "nur EMG" entfernt
    # ihn der Generator (dort folgt die EMG-Kostensektion direkt auf die
    # KOSTEN-Ueberschrift, der Abstand waere eine Leerzeile unter dem Titel)
    p.append(
        '<w:p w14:paraId="0C000001" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/><w:tab w:val="left" w:pos="708"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/><w:ind w:left="360" w:hanging="360"/>'
        '<w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:vanish/></w:rPr><w:t>{{EMGK_ABSTAND}}</w:t></w:r></w:p>'
    )
    p.append(
        '<w:p w14:paraId="0C000002" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>'
        '<w:tabs><w:tab w:val="clear" w:pos="284"/><w:tab w:val="left" w:pos="708"/></w:tabs>'
        '<w:spacing w:before="120" w:after="60"/><w:ind w:left="567" w:hanging="567"/>'
        '<w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:b/></w:rPr><w:t>{{NR_EMGK}}</w:t></w:r>'
        '<w:r><w:rPr><w:b/></w:rPr><w:tab/><w:t>Erschütterungsmessung</w:t></w:r></w:p>'
    )
    p.append(
        '<w:p w14:paraId="0C000003" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr><w:spacing w:after="60"/>'
        '<w:ind w:left="567"/></w:pPr>'
        '<w:r><w:t xml:space="preserve">Wir schlagen Ihnen vor, die anfallenden Kosten '
        'für die Erschütterungsmessungen (Annahme: {{EMG_ANNAHME}}) '
        'wie folgt für Sie ausführen zu dürfen:</w:t></w:r></w:p>'
    )
    # Tabelle
    tbl = [
        '<w:tbl><w:tblPr><w:tblW w:w="8364" w:type="dxa"/><w:tblInd w:w="637" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>'
        '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/>'
        '<w:right w:w="70" w:type="dxa"/></w:tblCellMar>'
        '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" '
        'w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr>'
        '<w:tblGrid><w:gridCol w:w="6521"/><w:gridCol w:w="1843"/></w:tblGrid>'
    ]
    # Kopfzeile (schwarz) + Abstandszeile
    tbl.append(
        '<w:tr w:rsidR="00996441"><w:trPr><w:tblHeader/></w:trPr>'
        '<w:tc><w:tcPr><w:tcW w:w="6521" w:type="dxa"/><w:tcBorders>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="FFFFFF"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="FFFFFF"/></w:tcBorders>'
        '<w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:tcPr>'
        '<w:p w14:paraId="0C000004" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:spacing w:before="120" w:after="120"/>'
        '<w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr>'
        '<w:t>Tätigkeit</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="1843" w:type="dxa"/><w:tcBorders>'
        '<w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="FFFFFF"/>'
        '</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="000000"/></w:tcPr>'
        '<w:p w14:paraId="0C000005" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:spacing w:before="120" w:after="120"/>'
        '<w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:b/></w:rPr><w:t>Fr.</w:t></w:r></w:p></w:tc></w:tr>'
    )
    tbl.append(
        '<w:tr w:rsidR="00996441"><w:trPr><w:trHeight w:hRule="exact" w:val="120"/>'
        '<w:tblHeader/></w:trPr>'
        '<w:tc><w:tcPr><w:tcW w:w="6521" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr>'
        '<w:p w14:paraId="0C000006" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"/></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="1843" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr>'
        '<w:p w14:paraId="0C000007" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:ind w:right="412"/><w:jc w:val="right"/>'
        '</w:pPr></w:p></w:tc></w:tr>'
    )
    # Grundpauschale (2 Absaetze im Label)
    tbl.append(kosten_row(
        '0C000008', '0C000009',
        label_para('0C00000A', 'Grundpauschale ')
        + label_para('0C00000B', '(Organisation, Konfiguration, Installation &amp; Deinstallation)'),
        '{{EMG_PREIS_GRUND}}', top='4', bottom='4', valign=True,
    ))
    # Vorhalten (2 Absaetze im Label)
    tbl.append(kosten_row(
        '0C00000C', '0C00000D',
        label_para('0C00000E', 'Vorhalten Erschütterungsmessgeräte')
        + label_para('0C00000F', '{{EMG_VORHALTEN_DETAIL}}'),
        '{{EMG_PREIS_VORHALTEN}}', top='4', bottom='4', valign=True,
    ))
    # Abschlussbericht
    tbl.append(kosten_row(
        '0C000010', '0C000011',
        label_para('0C000012', '{{EMG_AB_LABEL}}'),
        '{{EMG_PREIS_AB}}', top='4', bottom='4',
    ))
    # Rabatt (wird bei 0% vom Generator entfernt)
    tbl.append(kosten_row(
        '0C000013', '0C000014',
        label_para('0C000015', '{{EMG_RABATT_LABEL}}'),
        '{{EMG_PREIS_RABATT}}', top='4', bottom='12',
    ))
    # Zwischentotal / MwSt
    tbl.append(kosten_row(
        '0C000016', '0C000017',
        label_para('0C000018', 'Zwischentotal'),
        '{{EMG_PREIS_ZWISCHEN}}', top='12', bottom='4',
    ))
    tbl.append(kosten_row(
        '0C000019', '0C00001A',
        label_para('0C00001B', 'MwSt. 8.1%'),
        '{{EMG_PREIS_MWST}}', top='4', bottom='12',
    ))
    # Abstandszeile
    tbl.append(
        '<w:tr w:rsidR="00996441"><w:trPr><w:trHeight w:hRule="exact" w:val="113"/></w:trPr>'
        '<w:tc><w:tcPr><w:tcW w:w="6521" w:type="dxa"/><w:tcBorders>'
        '<w:top w:val="single" w:sz="12" w:space="0" w:color="auto"/><w:bottom w:val="nil"/>'
        '</w:tcBorders></w:tcPr>'
        '<w:p w14:paraId="0C00001C" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_LABEL}</w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="1843" w:type="dxa"/><w:tcBorders>'
        '<w:top w:val="single" w:sz="12" w:space="0" w:color="auto"/><w:bottom w:val="nil"/>'
        '</w:tcBorders></w:tcPr>'
        '<w:p w14:paraId="0C00001D" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_PREIS}</w:p></w:tc></w:tr>'
    )
    # Total (Doppellinie unten)
    tbl.append(
        '<w:tr w:rsidR="00996441">'
        '<w:tc><w:tcPr><w:tcW w:w="6521" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/>'
        '<w:bottom w:val="double" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr>'
        + label_para('0C00001E', '{{EMG_TOTAL_LABEL}}', bold=True)
        + '</w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="1843" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/>'
        '<w:bottom w:val="double" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders></w:tcPr>'
        '<w:p w14:paraId="0C00001F" w14:textId="77777777" w:rsidR="00996441" '
        f'w:rsidRDefault="00996441">{PPR_PREIS.replace("<w:bCs/>", "<w:b/>")}'
        '<w:r><w:rPr><w:b/></w:rPr><w:t>{{EMG_PREIS_TOTAL}}</w:t></w:r></w:p></w:tc></w:tr>'
    )
    tbl.append('</w:tbl>')
    p.append(''.join(tbl))
    # Fussnote
    p.append(
        '<w:p w14:paraId="0C000020" w14:textId="77777777" w:rsidR="00996441" '
        'w:rsidRDefault="00996441"><w:pPr><w:ind w:left="567"/>'
        '<w:rPr><w:i/><w:noProof/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr>'
        '<w:r><w:rPr><w:i/><w:noProof/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
        '<w:t>*Dieser Pauschalpreis gilt nur für die genannte Anzahl Messgeräte '
        'innerhalb des genannten Messzeitraums. Für jede weitere Woche fallen pro '
        'Gerät CHF {{EMG_FOLGETARIF}} an.</w:t></w:r></w:p>'
    )
    return marker_para('0C000000', '{{EMGK_START}}') + ''.join(p) + marker_para('0C000021', '{{EMGK_END}}')


def replace_once(xml: str, old: str, new: str, what: str) -> str:
    n = xml.count(old)
    if n != 1:
        sys.exit(f'FEHLER: "{what}" {n}x gefunden (erwartet 1)')
    return xml.replace(old, new)


def main() -> None:
    if not SRC.exists():
        sys.exit(f'Quelle fehlt: {SRC}')

    with zipfile.ZipFile(SRC) as z:
        xml = z.read('word/document.xml').decode('utf-8')

    n_checkboxes_before = xml.count('<w14:checkbox>')
    assert n_checkboxes_before == 41, n_checkboxes_before

    # 1. Betreffzeile
    xml = replace_once(
        xml,
        '<w:t>{{OFFNR_D}}: Offerte für Beweissicherung</w:t>',
        '<w:t>{{OFFNR_D}}: Offerte für {{OFFERT_TITEL}}</w:t>',
        'Betreffzeile',
    )

    # 2. Ausgangslage-Schlussteil
    xml = replace_once(
        xml,
        'sollen vorgängig zwecks Beweissicherung Zustandsaufnahmen der '
        'umliegenden Bauten erstellt werden.</w:t>',
        '{{AUSGANGSLAGE_ZIEL}}</w:t>',
        'Ausgangslage-Schluss',
    )

    # 3. BS-Block-Marker um Kapitel "Leistungen Beweissicherung"
    bs_heading_anchor = '<w:p w14:paraId="493AD9A2"'
    xml = replace_once(
        xml, bs_heading_anchor,
        marker_para('0D000001', '{{BS_START}}') + bs_heading_anchor,
        'BS_START-Anker',
    )
    bs_end_anchor = '<w:bookmarkEnd w:id="2"/>'
    xml = replace_once(
        xml, bs_end_anchor,
        bs_end_anchor + marker_para('0D000002', '{{BS_END}}'),
        'BS_END-Anker',
    )

    # 4. EMG-Leistungen-Block direkt nach {{BS_END}} einfuegen
    bs_end_marker = marker_para('0D000002', '{{BS_END}}')
    xml = replace_once(
        xml, bs_end_marker,
        bs_end_marker + build_emg_leistungen_block(),
        'EMG-Leistungen-Einfuegepunkt',
    )

    # 5. "3.1" der Kostensektion -> {{NR_KOSTEN}}
    xml = replace_once(
        xml,
        '<w:r><w:rPr><w:b/></w:rPr><w:t>3</w:t></w:r>'
        '<w:r w:rsidR="005002B7"><w:rPr><w:b/></w:rPr><w:t>.1</w:t></w:r>',
        '<w:r><w:rPr><w:b/></w:rPr><w:t>{{NR_KOSTEN}}</w:t></w:r>',
        'NR_KOSTEN',
    )

    # 6. BSK-Marker um BS-Kostensektion (3.1-Absatz bis Tabellenende)
    bsk_start_anchor = '<w:p w14:paraId="2E1CDA0A"'
    xml = replace_once(
        xml, bsk_start_anchor,
        marker_para('0D000003', '{{BSK_START}}') + bsk_start_anchor,
        'BSK_START-Anker',
    )
    bsk_end_anchor = '</w:tbl><w:p w14:paraId="67939EB3"'
    xml = replace_once(
        xml, bsk_end_anchor,
        '</w:tbl>' + marker_para('0D000004', '{{BSK_END}}')
        + build_emg_kosten_block() + '<w:p w14:paraId="67939EB3"',
        'BSK_END/EMG-Kosten-Einfuegepunkt',
    )

    # 7. Termine-Texte
    xml = replace_once(
        xml,
        '<w:t>Die Aufnahmen werden in Absprache mit dem Auftraggeber durchgeführt.</w:t>',
        '<w:t>{{TERMINE_SATZ1}}</w:t>',
        'Termine Satz 1',
    )
    xml = replace_once(
        xml,
        '<w:t>, um die gewünschten Aufnahmen zu terminieren</w:t>',
        '<w:t xml:space="preserve">, um {{TERMINE_OBJEKT}} zu terminieren</w:t>',
        'Termine Vorlaufzeit-Objekt',
    )

    # 8. Ueberschrift-2-Titel: Abstand "Vor" auf 0 (direkte Formatierung aller
    # Kapitel-Ueberschriften; der Style-Wert folgt unten in styles.xml)
    n_headings = xml.count('<w:spacing w:before="480" w:after="120"/>')
    if n_headings != 8:
        sys.exit(f'FEHLER: {n_headings} Ueberschrift-Abstaende gefunden (erwartet 8)')
    xml = xml.replace(
        '<w:spacing w:before="480" w:after="120"/>',
        '<w:spacing w:before="0" w:after="120"/>',
    )

    # Pruefungen
    n_checkboxes_after = xml.count('<w14:checkbox>')
    assert n_checkboxes_after == 49, n_checkboxes_after
    n_glyphs = xml.count('<w:t>☐</w:t>')
    assert n_glyphs == 49, n_glyphs

    placeholders = sorted(set(re.findall(r'\{\{[A-Z0-9_]+\}\}', xml)))
    expected_new = {
        '{{OFFERT_TITEL}}', '{{AUSGANGSLAGE_ZIEL}}', '{{BS_START}}', '{{BS_END}}',
        '{{EMG_START}}', '{{EMG_END}}', '{{EMG_PB}}', '{{NR_EMG}}',
        '{{EMG_GEOPHONE}}', '{{EMG_VORHALTEN_WOCHEN}}', '{{EMG_TARIFE}}',
        '{{NR_KOSTEN}}', '{{BSK_START}}', '{{BSK_END}}',
        '{{EMGK_START}}', '{{EMGK_END}}', '{{NR_EMGK}}', '{{EMG_ANNAHME}}',
        '{{EMG_PREIS_GRUND}}', '{{EMG_VORHALTEN_DETAIL}}', '{{EMG_PREIS_VORHALTEN}}',
        '{{EMG_AB_LABEL}}', '{{EMG_PREIS_AB}}', '{{EMG_RABATT_LABEL}}',
        '{{EMG_PREIS_RABATT}}', '{{EMG_PREIS_ZWISCHEN}}', '{{EMG_PREIS_MWST}}',
        '{{EMG_TOTAL_LABEL}}', '{{EMG_PREIS_TOTAL}}', '{{EMG_FOLGETARIF}}',
        '{{TERMINE_SATZ1}}', '{{TERMINE_OBJEKT}}',
    }
    missing = expected_new - set(placeholders)
    if missing:
        sys.exit(f'FEHLER: Platzhalter fehlen: {missing}')

    # Keine NEUEN doppelten paraIds (V12 enthaelt bereits 4 Word-tolerierte Duplikate)
    with zipfile.ZipFile(SRC) as z:
        src_xml = z.read('word/document.xml').decode('utf-8')
    src_ids = re.findall(r'w14:paraId="([0-9A-F]{8})"', src_xml)
    preexisting_dups = {i for i in src_ids if src_ids.count(i) > 1}
    para_ids = re.findall(r'w14:paraId="([0-9A-F]{8})"', xml)
    dups = {i for i in para_ids if para_ids.count(i) > 1} - preexisting_dups
    if dups:
        sys.exit(f'FEHLER: neue doppelte paraIds: {dups}')

    # 9. styles.xml: Style "berschrift2" Abstand "Vor" 10 Pt -> 0
    with zipfile.ZipFile(SRC) as z:
        styles_xml = z.read('word/styles.xml').decode('utf-8')
    style_match = re.search(
        r'<w:style [^>]*w:styleId="berschrift2">.*?</w:style>', styles_xml, re.S
    )
    if not style_match or '<w:spacing w:before="200"/>' not in style_match.group(0):
        sys.exit('FEHLER: Style berschrift2 mit w:before="200" nicht gefunden')
    styles_xml = styles_xml.replace(
        style_match.group(0),
        style_match.group(0).replace('<w:spacing w:before="200"/>', '<w:spacing w:before="0"/>'),
    )

    # V13 schreiben: alle Original-Eintraege kopieren, document.xml + styles.xml ersetzen
    shutil.copyfile(SRC, DST)
    with zipfile.ZipFile(SRC) as zin, zipfile.ZipFile(DST, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                data = xml.encode('utf-8')
            elif item.filename == 'word/styles.xml':
                data = styles_xml.encode('utf-8')
            zout.writestr(item, data)

    print(f'OK: {DST.name} geschrieben')
    print(f'  Checkboxen: {n_checkboxes_before} -> {n_checkboxes_after}')
    print(f'  Platzhalter total: {len(re.findall(r"{{[A-Z0-9_]+}}", xml))}')


if __name__ == '__main__':
    main()
