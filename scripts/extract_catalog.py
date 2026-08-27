import json
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_xlsx_rows(path):
    with zipfile.ZipFile(path) as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            ss = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in ss.findall("a:si", NS):
                shared_strings.append("".join(t.text or "" for t in si.iterfind(".//a:t", NS)))

        worksheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in worksheet.findall(".//a:sheetData/a:row", NS):
            values = []
            for cell in row.findall("a:c", NS):
                cell_type = cell.attrib.get("t")
                raw = cell.find("a:v", NS)
                value = raw.text if raw is not None and raw.text is not None else ""
                if cell_type == "s" and value:
                    value = shared_strings[int(value)]
                values.append(value.strip())
            rows.append(values)
        return rows


def as_bool_flag(value, true_token):
    return value.strip().upper() == true_token


def normalize_activity(activity):
    text = activity.strip()
    if text.lower().startswith("egresos cama "):
        return None
    if text.lower().startswith("atención en sala cama "):
        return "Atención en sala"
    return text


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: extract_catalog.py <xlsx_path>")

    rows = read_xlsx_rows(sys.argv[1])
    data = [row for row in rows[1:] if any(value for value in row)]

    dedup = {}
    hospitalizado_combos = set()

    for row in data:
        row = row + [""] * (7 - len(row))
        source_id, process, profession, specialty, activity, activity_type, performance_flag = row[:7]
        normalized_activity = normalize_activity(activity)
        if not normalized_activity:
            continue

        item = {
            "sourceId": source_id or None,
            "process": process.strip(),
            "profession": profession.strip(),
            "specialty": specialty.strip() or "No Aplica",
            "activity": normalized_activity,
            "isClinical": as_bool_flag(activity_type, "C"),
            "hasPerformance": as_bool_flag(performance_flag, "R"),
            "rawProcess": process.strip(),
            "rawType": activity_type.strip() or None,
            "rawPerformanceFlag": performance_flag.strip() or None,
        }
        key = (item["process"], item["profession"], item["specialty"], item["activity"])
        dedup[key] = item

        if item["process"] == "Hospitalizado":
            hospitalizado_combos.add((item["profession"], item["specialty"]))

    for profession, specialty in sorted(hospitalizado_combos):
        key = ("Hospitalizado", profession, specialty, "Interconsulta")
        if key not in dedup:
            dedup[key] = {
                "sourceId": None,
                "process": "Hospitalizado",
                "profession": profession,
                "specialty": specialty,
                "activity": "Interconsulta",
                "isClinical": True,
                "hasPerformance": False,
                "rawProcess": "Hospitalizado",
                "rawType": "C",
                "rawPerformanceFlag": "NR",
            }

    catalog = sorted(dedup.values(), key=lambda item: (item["process"], item["profession"], item["specialty"], item["activity"]))

    print(json.dumps({
        "rowsRead": len(data),
        "rowsImported": len(catalog),
        "catalog": catalog,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
