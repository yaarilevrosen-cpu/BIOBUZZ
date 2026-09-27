#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
padbridge — גשר ושרת חדר לסימולטור BIOBUZZ של אפולו 9662.

שלושה תפקידים, ואף אחד מהם לא מכיל לוגיקת משחק — הגשר רק מעביר בתים:
  pad   — שלט הטלפון (דרך adb reverse או ברשת) ↔ הסימולטור במחשב הזה
  host  — הסימולטור שפתח חדר; הוא המכריע
  guest — סימולטור במחשב אחר באותה רשת

ספריית התקן בלבד. פייתון 3.8 ומעלה.
הרצה:  python padbridge.py            (פורט 9662)
       python padbridge.py --no-adb   (בלי לחפש טלפון בכבל)
       python padbridge.py --sim BIOBUZZ-lab.html
"""
import argparse, base64, hashlib, ipaddress, json, os, random, shutil, socket, struct
import subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote

PAD_B64 = "PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9ImhlIiBkaXI9InJ0bCI+PGhlYWQ+PG1ldGEgY2hhcnNldD0idXRmLTgiPgo8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLGluaXRpYWwtc2NhbGU9MSxtYXhpbXVtLXNjYWxlPTEsdXNlci1zY2FsYWJsZT1ubyx2aWV3cG9ydC1maXQ9Y292ZXIiPgo8bWV0YSBuYW1lPSJ0aGVtZS1jb2xvciIgY29udGVudD0iIzBCMEUxMiI+Cjx0aXRsZT7Xqdec15ggQklPQlVaWjwvdGl0bGU+CjxzdHlsZT4KICA6cm9vdHstLWJnOiMwQjBFMTI7LS1wYW5lbDojMTQxQTIxOy0tcGFuZWwyOiMxQzI0MkQ7LS1saW5lOiMyODMyM0Q7LS1saW5lMjojMzg0MzRFOwogICAgLS1pbms6I0U5RUZGNTstLWluazI6I0I5QzZEMjstLWRpbTojNUM2Qjc5Oy0tYWNjZW50OiNGRkIwMjA7LS1nb29kOiMzNUQ2QTQ7LS1yZWQ6I0YyNTQ1QjstLWJsdWU6IzRDOUFGNX0KICAqe2JveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnQ7dXNlci1zZWxlY3Q6bm9uZTstd2Via2l0LXVzZXItc2VsZWN0Om5vbmV9CiAgaHRtbCxib2R5e21hcmdpbjowO2hlaWdodDoxMDAlO2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLWluayk7b3ZlcmZsb3c6aGlkZGVuOwogICAgZm9udC1mYW1pbHk6c3lzdGVtLXVpLCJTZWdvZSBVSSIsc2Fucy1zZXJpZjt0b3VjaC1hY3Rpb246bm9uZX0KICAjdG9we3Bvc2l0aW9uOmZpeGVkO3RvcDowO2luc2V0LWlubGluZTowO2hlaWdodDo0MHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7CiAgICBwYWRkaW5nOjAgMTJweDtiYWNrZ3JvdW5kOnZhcigtLXBhbmVsKTtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTtmb250LXNpemU6MTJweDt6LWluZGV4OjV9CiAgI3N0e2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjZweH0KICAjbGVke3dpZHRoOjlweDtoZWlnaHQ6OXB4O2JvcmRlci1yYWRpdXM6NTAlO2JhY2tncm91bmQ6dmFyKC0tcmVkKX0KICAjbGVkLm9re2JhY2tncm91bmQ6dmFyKC0tZ29vZCl9CiAgLmNoaXB7cGFkZGluZzoycHggOHB4O2JvcmRlci1yYWRpdXM6N3B4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZTIpO2NvbG9yOnZhcigtLWluazIpfQogIC5jaGlwLm9ue2JvcmRlci1jb2xvcjp2YXIoLS1hY2NlbnQpO2NvbG9yOnZhcigtLWFjY2VudCl9CiAgI3Nwe2ZsZXg6MX0KICAjZ2VhcntiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lMik7Y29sb3I6dmFyKC0taW5rMik7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzo0cHggMTBweDtmb250OmluaGVyaXR9CiAgLnpvbmV7cG9zaXRpb246Zml4ZWQ7dG9wOjQwcHg7Ym90dG9tOjA7d2lkdGg6NTAlfQogICN6THtsZWZ0OjB9ICN6UntyaWdodDowfQogIC5zdGlja3twb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxNTBweDtoZWlnaHQ6MTUwcHg7bWFyZ2luOi03NXB4IDAgMCAtNzVweDtib3JkZXItcmFkaXVzOjUwJTsKICAgIGJvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JhY2tncm91bmQ6cmdiYSgyOCwzNiw0NSwuNTUpO2Rpc3BsYXk6bm9uZTtwb2ludGVyLWV2ZW50czpub25lfQogIC5zdGljayBpe3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6NTAlO3RvcDo1MCU7d2lkdGg6NjJweDtoZWlnaHQ6NjJweDttYXJnaW46LTMxcHggMCAwIC0zMXB4OwogICAgYm9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDp2YXIoLS1hY2NlbnQpO29wYWNpdHk6Ljl9CiAgLmhpbnR7cG9zaXRpb246YWJzb2x1dGU7Ym90dG9tOjE0cHg7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjp2YXIoLS1kaW0pO2ZvbnQtc2l6ZToxMnB4O3BvaW50ZXItZXZlbnRzOm5vbmV9CiAgLmJ0bnN7cG9zaXRpb246Zml4ZWQ7ei1pbmRleDozO2Rpc3BsYXk6ZmxleDtnYXA6MTBweH0KICAuYnt3aWR0aDo2MnB4O2hlaWdodDo2MnB4O2JvcmRlci1yYWRpdXM6NTAlO2JvcmRlcjoycHggc29saWQgdmFyKC0tbGluZTIpO2JhY2tncm91bmQ6dmFyKC0tcGFuZWwyKTsKICAgIGNvbG9yOnZhcigtLWluayk7Zm9udDo2MDAgMTVweCBzeXN0ZW0tdWk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyfQogIC5iLmRue2JhY2tncm91bmQ6dmFyKC0tYWNjZW50KTtjb2xvcjojMEIwRTEyO2JvcmRlci1jb2xvcjp2YXIoLS1hY2NlbnQpfQogIC5zaHt3aWR0aDo5MnB4O2hlaWdodDo0NHB4O2JvcmRlci1yYWRpdXM6MTJweDtmb250LXNpemU6MTNweH0KICAjZmlyZXt3aWR0aDo5MnB4O2hlaWdodDo5MnB4O2ZvbnQtc2l6ZToxN3B4O2JvcmRlci1jb2xvcjp2YXIoLS1yZWQpfQogICNmaXJlLmRue2JhY2tncm91bmQ6dmFyKC0tcmVkKTtjb2xvcjojZmZmfQogICNmYWNlc3tyaWdodDoxOHB4O2JvdHRvbToxOHB4O2ZsZXgtd3JhcDp3cmFwO3dpZHRoOjIwMHB4O2p1c3RpZnktY29udGVudDpmbGV4LWVuZH0KICAjc2hMe2xlZnQ6MThweDt0b3A6NTRweH0gI3NoUntyaWdodDoxOHB4O3RvcDo1NHB4fQogICNsdHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjE4cHg7dG9wOjEwOHB4O3dpZHRoOjQ0cHg7aGVpZ2h0OjE1MHB4O2JvcmRlci1yYWRpdXM6MTJweDtib3JkZXI6MnB4IHNvbGlkIHZhcigtLWxpbmUyKTsKICAgIGJhY2tncm91bmQ6dmFyKC0tcGFuZWwyKTt6LWluZGV4OjM7b3ZlcmZsb3c6aGlkZGVufQogICNsdCBpe3Bvc2l0aW9uOmFic29sdXRlO2JvdHRvbTowO2xlZnQ6MDtyaWdodDowO2hlaWdodDowO2JhY2tncm91bmQ6dmFyKC0tYWNjZW50KTtvcGFjaXR5Oi44fQogICNsdCBzcGFue3Bvc2l0aW9uOmFic29sdXRlO3RvcDo2cHg7d2lkdGg6MTAwJTt0ZXh0LWFsaWduOmNlbnRlcjtmb250LXNpemU6MTFweDtjb2xvcjp2YXIoLS1pbmsyKX0KICAjc2V0e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjQwcHggMCAwIDA7YmFja2dyb3VuZDpyZ2JhKDExLDE0LDE4LC45Nyk7ei1pbmRleDo5O3BhZGRpbmc6MTZweDtkaXNwbGF5Om5vbmU7b3ZlcmZsb3c6YXV0b30KICAjc2V0Lm9ue2Rpc3BsYXk6YmxvY2t9CiAgI3NldCBsYWJlbHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMnB4O3BhZGRpbmc6MTBweCAwOwogICAgYm9yZGVyLWJvdHRvbToxcHggc29saWQgdmFyKC0tbGluZSk7Zm9udC1zaXplOjE0cHh9CiAgI3NldCBpbnB1dFt0eXBlPXJhbmdlXXt3aWR0aDo1MCV9CiAgI3JvdHtwb3NpdGlvbjpmaXhlZDtpbnNldDowO2JhY2tncm91bmQ6dmFyKC0tYmcpO3otaW5kZXg6MjA7ZGlzcGxheTpub25lO2FsaWduLWl0ZW1zOmNlbnRlcjsKICAgIGp1c3RpZnktY29udGVudDpjZW50ZXI7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjE4cHg7cGFkZGluZzozMHB4fQogIEBtZWRpYSAob3JpZW50YXRpb246cG9ydHJhaXQpeyAjcm90e2Rpc3BsYXk6ZmxleH0gfQo8L3N0eWxlPjwvaGVhZD48Ym9keT4KPGRpdiBpZD0idG9wIj48ZGl2IGlkPSJzdCI+PGkgaWQ9ImxlZCI+PC9pPjxzcGFuIGlkPSJzdHgiPtee16rXl9eR16jigKY8L3NwYW4+PC9kaXY+CiAgPHNwYW4gY2xhc3M9ImNoaXAiIGlkPSJjTWFnIj7XnteX16HXoNeZ16ogMDwvc3Bhbj48c3BhbiBjbGFzcz0iY2hpcCIgaWQ9ImNJbiI+15DXmdeh15XXozwvc3Bhbj4KICA8c3BhbiBjbGFzcz0iY2hpcCIgaWQ9ImNGYyI+16bXmdeoINeo15XXkdeV15g8L3NwYW4+PHNwYW4gaWQ9InNwIj48L3NwYW4+PHNwYW4gaWQ9InBpbmciPjwvc3Bhbj4KICA8YnV0dG9uIGlkPSJnZWFyIj7XlNeS15PXqNeV16o8L2J1dHRvbj48L2Rpdj4KPGRpdiBjbGFzcz0iem9uZSIgaWQ9InpMIj48ZGl2IGNsYXNzPSJzdGljayIgaWQ9InNMIj48aT48L2k+PC9kaXY+PGRpdiBjbGFzcz0iaGludCI+16DXkteZ16LXlCDXm9eQ158g4oCUINeg16HXmdei15Q8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iem9uZSIgaWQ9InpSIj48ZGl2IGNsYXNzPSJzdGljayIgaWQ9InNSIj48aT48L2k+PC9kaXY+PGRpdiBjbGFzcz0iaGludCI+16DXkteZ16LXlCDXm9eQ158g4oCUINeh15nXkdeV15E8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iYnRucyIgaWQ9InNoTCI+PGJ1dHRvbiBjbGFzcz0iYiBzaCIgZGF0YS1iaXQ9IjQiPteQ15nXodeV16M8L2J1dHRvbj48L2Rpdj4KPGRpdiBpZD0ibHQiPjxzcGFuPteT15nXldenPC9zcGFuPjxpPjwvaT48L2Rpdj4KPGRpdiBjbGFzcz0iYnRucyIgaWQ9InNoUiI+PGJ1dHRvbiBjbGFzcz0iYiBzaCIgZGF0YS1iaXQ9IjUiPteb16rXoyDXmdee15nXnzwvYnV0dG9uPjwvZGl2Pgo8ZGl2IGNsYXNzPSJidG5zIiBpZD0iZmFjZXMiPgogIDxidXR0b24gY2xhc3M9ImIiIGRhdGEtYml0PSIzIj5ZPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYiIgZGF0YS1iaXQ9IjIiPlg8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJiIiBkYXRhLWJpdD0iMSI+QjwvYnV0dG9uPjxidXR0b24gY2xhc3M9ImIiIGRhdGEtYml0PSIwIj5BPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYiIgaWQ9ImZpcmUiIGRhdGEtcnQ9IjEiPteZ16jXmTwvYnV0dG9uPgo8L2Rpdj4KPGRpdiBpZD0ic2V0Ij4KICA8bGFiZWw+15DXlteV16gg157XqiA8aW5wdXQgdHlwZT0icmFuZ2UiIGlkPSJvRGVhZCIgbWluPSIwIiBtYXg9IjAuNCIgc3RlcD0iMC4wMSIgdmFsdWU9IjAuMDgiPjwvbGFiZWw+CiAgPGxhYmVsPteo15PXmdeV16Eg15TXodeY15nXpyA8aW5wdXQgdHlwZT0icmFuZ2UiIGlkPSJvUmFkIiBtaW49IjQwIiBtYXg9IjExMCIgc3RlcD0iMSIgdmFsdWU9IjcwIj48L2xhYmVsPgogIDxsYWJlbD7XqNeY15ggPGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0ib1ZpYiIgY2hlY2tlZD48L2xhYmVsPgogIDxsYWJlbD7XoNeh15nXoteUINeR16bXkyDXmdee15nXnyAo16nXnteQ15zXmdeZ150pIDxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9Im9Td2FwIj48L2xhYmVsPgogIDxsYWJlbD7XlNeZ16TXldeaINem15nXqCDXp9eT15nXnteUIDxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9Im9JbnYiPjwvbGFiZWw+CiAgPGxhYmVsPteU16rXl9ecIDxidXR0b24gY2xhc3M9ImIgc2giIGRhdGEtYml0PSI5IiBzdHlsZT0id2lkdGg6MTIwcHgiPlN0YXJ0PC9idXR0b24+PC9sYWJlbD4KICA8bGFiZWw+15fXlteV16ggPGJ1dHRvbiBjbGFzcz0iYiBzaCIgZGF0YS1iaXQ9IjgiIHN0eWxlPSJ3aWR0aDoxMjBweCI+QmFjazwvYnV0dG9uPjwvbGFiZWw+CjwvZGl2Pgo8ZGl2IGlkPSJyb3QiPteh15XXkdeRINeQ16og15TXmNec16TXldefINec16jXldeX15E8L2Rpdj4KPHNjcmlwdD4KKGZ1bmN0aW9uKCl7CiJ1c2Ugc3RyaWN0IjsKY29uc3QgJD1pZD0+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpOwpjb25zdCBTPXthOlswLDAsMCwwXSxiOjAsbHQ6MCxydDowfTsKY29uc3QgTz17ZGVhZDowLjA4LHJhZDo3MCx2aWI6dHJ1ZSxzd2FwOmZhbHNlLGludjpmYWxzZX07CnRyeXsgT2JqZWN0LmFzc2lnbihPLEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oImJiUGFkT3B0cyIpfHwie30iKSk7IH1jYXRjaChlKXt9CmNvbnN0IHNhdmVPPSgpPT57IHRyeXsgbG9jYWxTdG9yYWdlLnNldEl0ZW0oImJiUGFkT3B0cyIsSlNPTi5zdHJpbmdpZnkoTykpOyB9Y2F0Y2goZSl7fSB9OwokKCJvRGVhZCIpLnZhbHVlPU8uZGVhZDsgJCgib1JhZCIpLnZhbHVlPU8ucmFkOyAkKCJvVmliIikuY2hlY2tlZD1PLnZpYjsgJCgib1N3YXAiKS5jaGVja2VkPU8uc3dhcDsgJCgib0ludiIpLmNoZWNrZWQ9Ty5pbnY7CiQoIm9EZWFkIikub25pbnB1dD1lPT57Ty5kZWFkPStlLnRhcmdldC52YWx1ZTtzYXZlTygpO307CiQoIm9SYWQiKS5vbmlucHV0PWU9PntPLnJhZD0rZS50YXJnZXQudmFsdWU7c2F2ZU8oKTt9OwokKCJvVmliIikub25jaGFuZ2U9ZT0+e08udmliPWUudGFyZ2V0LmNoZWNrZWQ7c2F2ZU8oKTt9OwokKCJvU3dhcCIpLm9uY2hhbmdlPWU9PntPLnN3YXA9ZS50YXJnZXQuY2hlY2tlZDtzYXZlTygpO307CiQoIm9JbnYiKS5vbmNoYW5nZT1lPT57Ty5pbnY9ZS50YXJnZXQuY2hlY2tlZDtzYXZlTygpO307CiQoImdlYXIiKS5vbmNsaWNrPSgpPT4kKCJzZXQiKS5jbGFzc0xpc3QudG9nZ2xlKCJvbiIpOwoKbGV0IHdzPW51bGwsIGxhc3Q9IiIsIGJlYXQ9MDsKZnVuY3Rpb24gc2VuZChvKXsgaWYod3MmJndzLnJlYWR5U3RhdGU9PT0xKSB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KG8pKTsgfQpmdW5jdGlvbiBwdXNoKGZvcmNlKXsKICBjb25zdCBtPXt0OiJzIixhOlMuYS5tYXAodj0+K3YudG9GaXhlZCgzKSksYjpTLmIsbHQ6K1MubHQudG9GaXhlZCgzKSxydDpTLnJ0fTsKICBjb25zdCBzPUpTT04uc3RyaW5naWZ5KG0pOwogIGlmKGZvcmNlfHxzIT09bGFzdCl7IGxhc3Q9czsgaWYod3MmJndzLnJlYWR5U3RhdGU9PT0xKSB3cy5zZW5kKHMpOyB9Cn0KZnVuY3Rpb24gY29ubmVjdCgpewogIHdzPW5ldyBXZWJTb2NrZXQoIndzOi8vIitsb2NhdGlvbi5ob3N0KyIvd3M/cm9sZT1wYWQiKTsKICB3cy5vbm9wZW49KCk9PnsgJCgibGVkIikuY2xhc3NMaXN0LmFkZCgib2siKTsgJCgic3R4IikudGV4dENvbnRlbnQ9Itee15fXldeR16giOyBwdXNoKHRydWUpOyB9OwogIHdzLm9uY2xvc2U9KCk9PnsgJCgibGVkIikuY2xhc3NMaXN0LnJlbW92ZSgib2siKTsgJCgic3R4IikudGV4dENvbnRlbnQ9Itee16DXldeq16cg4oCUINee16rXl9eR16gg16nXldeRIjsgc2V0VGltZW91dChjb25uZWN0LDEyMDApOyB9OwogIHdzLm9ubWVzc2FnZT1lPT57IGxldCBtOyB0cnl7IG09SlNPTi5wYXJzZShlLmRhdGEpOyB9Y2F0Y2goeCl7IHJldHVybjsgfQogICAgaWYobS50PT09InIiKXsgaWYoTy52aWImJm5hdmlnYXRvci52aWJyYXRlKSBuYXZpZ2F0b3IudmlicmF0ZShNYXRoLm1heCgxMCxNYXRoLm1pbig0MDAsbS5tc3wwKSkpOyB9CiAgICBlbHNlIGlmKG0udD09PSJxIil7IHNlbmQoe3Q6InFyIixjOm0uY30pOyB9CiAgICBlbHNlIGlmKG0udD09PSJ1aSIpeyAkKCJjTWFnIikudGV4dENvbnRlbnQ9Itee15fXodeg15nXqiAiKyhtLm1hZ3wwKTsgJCgiY0luIikuY2xhc3NMaXN0LnRvZ2dsZSgib24iLCEhbS5pbnRha2UpOwogICAgICAkKCJjRmMiKS50ZXh0Q29udGVudD1tLmZjPyLXpteZ16gg157Xkteo16kiOiLXpteZ16gg16jXldeR15XXmCI7ICQoImNGYyIpLmNsYXNzTGlzdC50b2dnbGUoIm9uIiwhIW0uZmMpOyB9CiAgICBlbHNlIGlmKG0udD09PSJzaW0iKXsgJCgic3R4IikudGV4dENvbnRlbnQ9bS5vbj8i15TXodeZ157Xldec15jXldeoINee15fXldeR16giOiLXnteX15vXlCDXnNeh15nXnteV15zXmNeV16giOyB9CiAgfTsKfQpjb25uZWN0KCk7CnNldEludGVydmFsKCgpPT57IHB1c2godHJ1ZSk7IH0sMjAwKTsgICAgICAgICAgLyog16TXoteZ157XlCDXl9ee16kg16TXotee15nXnSDXkdep16DXmdeZ15Qg4oCUINep16fXmCDXpNeZ16jXldep15Ug16LXpteZ16jXlCAqLwoKLyog16HXmNeZ16fXmdedINem16TXmdedOiDXlNeg15LXmdei15Qg15TXmdeQINeU157XqNeb15YgKi8KZnVuY3Rpb24gc3RpY2soem9uZSxlbCxhcHBseSl7CiAgbGV0IGlkPW51bGwsIGN4PTAsIGN5PTA7IGNvbnN0IGtub2I9ZWwucXVlcnlTZWxlY3RvcigiaSIpOwogIGNvbnN0IHNldD0oeCx5KT0+eyBjb25zdCByPU8ucmFkLCBkPU1hdGguaHlwb3QoeCx5KSwgaz1kPnI/ci9kOjE7IHgqPWs7IHkqPWs7CiAgICBrbm9iLnN0eWxlLnRyYW5zZm9ybT0idHJhbnNsYXRlKCIreCsicHgsIit5KyJweCkiOwogICAgbGV0IG54PXgvciwgbnk9eS9yOyBjb25zdCBtPU1hdGguaHlwb3QobngsbnkpOwogICAgaWYobTxPLmRlYWQpeyBueD0wOyBueT0wOyB9IGVsc2UgeyBjb25zdCBzPShtLU8uZGVhZCkvKDEtTy5kZWFkKS9tOyBueCo9czsgbnkqPXM7IH0gIC8qINeQ15bXldeoINee16og16jXk9eZ15DXnNeZICovCiAgICBhcHBseShueCxueSk7IHB1c2goKTsgfTsKICB6b25lLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJkb3duIixlPT57IGlmKGlkIT09bnVsbCkgcmV0dXJuOyBpZD1lLnBvaW50ZXJJZDsgem9uZS5zZXRQb2ludGVyQ2FwdHVyZShpZCk7CiAgICBjeD1lLmNsaWVudFg7IGN5PWUuY2xpZW50WTsgZWwuc3R5bGUuZGlzcGxheT0iYmxvY2siOyBlbC5zdHlsZS5sZWZ0PWN4KyJweCI7IGVsLnN0eWxlLnRvcD1jeSsicHgiOwogICAgY29uc3Qgcj16b25lLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOyBlbC5zdHlsZS5sZWZ0PShjeC1yLmxlZnQpKyJweCI7IGVsLnN0eWxlLnRvcD0oY3ktci50b3ApKyJweCI7IHNldCgwLDApOyB9KTsKICB6b25lLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJtb3ZlIixlPT57IGlmKGUucG9pbnRlcklkIT09aWQpIHJldHVybjsgc2V0KGUuY2xpZW50WC1jeCxlLmNsaWVudFktY3kpOyB9KTsKICBjb25zdCBlbmQ9ZT0+eyBpZihlLnBvaW50ZXJJZCE9PWlkKSByZXR1cm47IGlkPW51bGw7IGVsLnN0eWxlLmRpc3BsYXk9Im5vbmUiOyBrbm9iLnN0eWxlLnRyYW5zZm9ybT0iIjsgYXBwbHkoMCwwKTsgcHVzaCgpOyB9OwogIHpvbmUuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcnVwIixlbmQpOyB6b25lLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJjYW5jZWwiLGVuZCk7Cn0KY29uc3QgZHJpdmU9KHgseSk9PnsgUy5hWzBdPXg7IFMuYVsxXT1PLmludj8teTp5OyB9Owpjb25zdCB0dXJuPSh4LHkpPT57IFMuYVsyXT14OyBTLmFbM109eTsgfTsKc3RpY2soJCgiekwiKSwkKCJzTCIpLCh4LHkpPT5PLnN3YXA/dHVybih4LHkpOmRyaXZlKHgseSkpOwpzdGljaygkKCJ6UiIpLCQoInNSIiksKHgseSk9Pk8uc3dhcD9kcml2ZSh4LHkpOnR1cm4oeCx5KSk7Cgpkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCIuYiIpLmZvckVhY2goYj0+ewogIGNvbnN0IG9uPXY9PnsgYi5jbGFzc0xpc3QudG9nZ2xlKCJkbiIsdik7CiAgICBpZihiLmRhdGFzZXQucnQpIFMucnQ9dj8xOjA7IGVsc2UgeyBjb25zdCBiaXQ9MTw8KCtiLmRhdGFzZXQuYml0KTsgUy5iPXY/KFMuYnxiaXQpOihTLmImfmJpdCk7IH0KICAgIHB1c2goKTsgfTsKICBiLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJkb3duIixlPT57IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgYi5zZXRQb2ludGVyQ2FwdHVyZShlLnBvaW50ZXJJZCk7IG9uKHRydWUpOyB9KTsKICBiLmFkZEV2ZW50TGlzdGVuZXIoInBvaW50ZXJ1cCIsKCk9Pm9uKGZhbHNlKSk7IGIuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcmNhbmNlbCIsKCk9Pm9uKGZhbHNlKSk7Cn0pOwovKiDXlNeT16cg16nXnteQ15zXmSDXkNeg15zXldeS15k6INeS15XXkdeUINeU16DXkteZ16LXlCDXlNeV15Ag16LXldee16cg15TXnNeX15nXpteUICovCihmdW5jdGlvbigpeyBjb25zdCBlbD0kKCJsdCIpLCBiYXI9ZWwucXVlcnlTZWxlY3RvcigiaSIpOyBsZXQgaWQ9bnVsbDsKICBjb25zdCBzZXQ9ZT0+eyBjb25zdCByPWVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOyBjb25zdCB2PU1hdGgubWF4KDAsTWF0aC5taW4oMSwoci5ib3R0b20tZS5jbGllbnRZKS9yLmhlaWdodCkpOwogICAgUy5sdD12OyBiYXIuc3R5bGUuaGVpZ2h0PSh2KjEwMCkrIiUiOyBwdXNoKCk7IH07CiAgZWwuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcmRvd24iLGU9PnsgZS5zdG9wUHJvcGFnYXRpb24oKTsgaWQ9ZS5wb2ludGVySWQ7IGVsLnNldFBvaW50ZXJDYXB0dXJlKGlkKTsgc2V0KGUpOyB9KTsKICBlbC5hZGRFdmVudExpc3RlbmVyKCJwb2ludGVybW92ZSIsZT0+eyBpZihlLnBvaW50ZXJJZD09PWlkKSBzZXQoZSk7IH0pOwogIGNvbnN0IGVuZD0oKT0+eyBpZD1udWxsOyBTLmx0PTA7IGJhci5zdHlsZS5oZWlnaHQ9IjAiOyBwdXNoKCk7IH07CiAgZWwuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcnVwIixlbmQpOyBlbC5hZGRFdmVudExpc3RlbmVyKCJwb2ludGVyY2FuY2VsIixlbmQpOyB9KSgpOwovKiDXnteh15og15PXldec16cg15XXnteh15og157XnNeQICovCmxldCBsb2NrPW51bGw7IGNvbnN0IHdha2U9KCk9PnsgdHJ5eyBpZihuYXZpZ2F0b3Iud2FrZUxvY2spIG5hdmlnYXRvci53YWtlTG9jay5yZXF1ZXN0KCJzY3JlZW4iKS50aGVuKGw9PmxvY2s9bCkuY2F0Y2goKCk9Pnt9KTsgfWNhdGNoKGUpe30gfTsKZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsKCk9PnsgaWYoIWRvY3VtZW50LmhpZGRlbikgd2FrZSgpOyB9KTsKZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigicG9pbnRlcmRvd24iLCgpPT57IHdha2UoKTsKICB0cnl7IGlmKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCYmZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKQogICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCkudGhlbigoKT0+eyB0cnl7IHNjcmVlbi5vcmllbnRhdGlvbi5sb2NrKCJsYW5kc2NhcGUiKTsgfWNhdGNoKGUpe30gfSkuY2F0Y2goKCk9Pnt9KTsgfWNhdGNoKGUpe30gfSx7b25jZTp0cnVlfSk7Cn0pKCk7Cjwvc2NyaXB0Pgo8L2JvZHk+PC9odG1sPgo="
HERE = os.path.dirname(os.path.abspath(__file__))
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

# ── קונסולה: עברית אם אפשר, אנגלית אם לא ──
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    "שלום".encode(sys.stdout.encoding or "ascii")
    HEB = True
except Exception:
    HEB = False

def say(he, en):
    try:
        print(he if HEB else en, flush=True)
    except UnicodeEncodeError:
        print(en, flush=True)

# ── קוד חדר: אותה פונקציה בדיוק כמו netCodeMake בסימולטור ──
AB = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def _check(d):
    return sum((i + 1) * v for i, v in enumerate(d)) % 32

def room_code(ip, port, key):
    p = [int(x) for x in ip.split(".")]
    off = port - 9662
    if len(p) != 4 or not (0 <= off <= 15):
        return ""
    # ברוב הבתים ובתי הספר הרשת היא 192.168.x.y — אז הקוד קצר: 6 תווים (XXX-XXX)
    if p[0] == 192 and p[1] == 168 and off == 0 and 0 < key < 0x1000:
        n = (p[2] << 20) | (p[3] << 12) | key
        d = []
        for _ in range(6):
            d.insert(0, n & 31)
            n >>= 5
        s = "".join(AB[v] for v in d)
        return s[:3] + "-" + s[3:]
    n = 0
    for v in p:
        n = (n << 8) | v
    n = (n << 4) | off
    n = (n << 14) | (key & 0x3FFF)
    d = []
    for _ in range(10):
        d.insert(0, n & 31)
        n >>= 5
    d.append(_check(d))
    s = "".join(AB[v] for v in d)
    return s[:4] + "-" + s[4:8] + "-" + s[8:]

def is_lan(addr):
    try:
        a = ipaddress.ip_address(addr.split("%")[0])
    except ValueError:
        return False
    if a.version == 6 and a.ipv4_mapped:
        a = a.ipv4_mapped
    return a.is_private or a.is_loopback or a.is_link_local

def is_local(addr):
    try:
        a = ipaddress.ip_address(addr.split("%")[0])
        if a.version == 6 and a.ipv4_mapped:
            a = a.ipv4_mapped
        return a.is_loopback
    except ValueError:
        return False

def lan_ips():
    out = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))          # לא שולח כלום — רק בוחר ממשק
        out.append(s.getsockname()[0]); s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in out:
                out.append(ip)
    except Exception:
        pass
    good = [ip for ip in out if is_lan(ip) and not ip.startswith("127.")]
    return good

def load_key(fixed):
    if fixed is not None:
        return fixed & 0x3FFF
    path = os.path.join(HERE, ".room-key")
    try:
        with open(path) as f:
            k = int(f.read().strip())
        if 0 < k < 0x1000:
            return k
        raise ValueError("old key")          # מפתח ישן וגדול — מחליפים במפתח של 12 ביט לקוד הקצר
    except Exception:
        k = random.SystemRandom().randrange(1, 0x1000)
        try:
            with open(path, "w") as f:
                f.write(str(k))
        except Exception:
            pass
        return k

# ── WebSocket מינימלי (RFC 6455) ──
class WS:
    def __init__(self, sock, role, addr):
        self.sock, self.role, self.addr = sock, role, addr
        self.lock = threading.Lock()
        self.alive = True
        self.id = None
        self.name = ""
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def _recv(self, n):
        buf = b""
        while len(buf) < n:
            c = self.sock.recv(n - len(buf))
            if not c:
                raise ConnectionError
            buf += c
        return buf

    def recv(self):
        """מחזיר (opcode, payload) של הודעה שלמה, כולל חיבור מקטעים"""
        data, first = b"", None
        while True:
            h = self._recv(2)
            fin, op = h[0] & 0x80, h[0] & 0x0F
            masked, ln = h[1] & 0x80, h[1] & 0x7F
            if ln == 126:
                ln = struct.unpack(">H", self._recv(2))[0]
            elif ln == 127:
                ln = struct.unpack(">Q", self._recv(8))[0]
            if ln > 4 * 1024 * 1024:
                raise ConnectionError
            mask = self._recv(4) if masked else b"\0\0\0\0"
            p = bytearray(self._recv(ln))
            for i in range(len(p)):
                p[i] ^= mask[i & 3]
            if op >= 8:                               # בקרה באמצע הודעה
                if op == 8:
                    raise ConnectionError
                if op == 9:
                    self.send(bytes(p), 0xA)
                continue
            if first is None:
                first = op
            data += bytes(p)
            if fin:
                return first, data

    def send(self, payload, op=None):
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
            op = 1 if op is None else op
        op = 2 if op is None else op
        n = len(payload)
        if n < 126:
            hdr = struct.pack(">BB", 0x80 | op, n)
        elif n < 65536:
            hdr = struct.pack(">BBH", 0x80 | op, 126, n)
        else:
            hdr = struct.pack(">BBQ", 0x80 | op, 127, n)
        try:
            with self.lock:
                self.sock.sendall(hdr + payload)
            return True
        except Exception:
            self.alive = False
            return False

    def close(self):
        self.alive = False
        try:
            self.sock.close()
        except Exception:
            pass

# ── החדר: מי מחובר, ולאן כל הודעה הולכת ──
class Room:
    def __init__(self, port, key):
        self.port, self.key = port, key
        self.lock = threading.Lock()
        self.sims, self.pads, self.guests = [], [], {}
        self.host = None
        self.n = 0
        self.lan = lan_ips()
        self.code = room_code(self.lan[0], port, key) if self.lan else ""

    def rekey(self):
        # קוד חדש לבקשת המארח — מי שכבר בפנים נשאר
        k = self.key
        while k == self.key:
            k = random.SystemRandom().randrange(1, 0x1000)
        self.key = k
        try:
            with open(os.path.join(HERE, ".room-key"), "w") as f:
                f.write(str(k))
        except Exception:
            pass
        self.lan = lan_ips()
        self.code = room_code(self.lan[0], self.port, k) if self.lan else ""

    def info(self):
        return {"t": "info", "lan": self.lan, "port": self.port, "key": self.key, "code": self.code}

    def health(self):
        with self.lock:
            return {"ok": True, "host": self.host is not None, "sims": len(self.sims),
                    "pad": len(self.pads) > 0,
                    "guests": [{"id": g.id, "name": g.name, "addr": g.addr} for g in self.guests.values()],
                    "port": self.port, "lan": self.lan, "code": self.code}

    def join_url(self):
        return "http://%s:%d/join?k=%d" % (self.lan[0], self.port, self.key) if self.lan else ""

    # שלט טלפון ↔ סימולטור
    def to_sims(self, msg):
        for s in list(self.sims):
            s.send(msg)

    def add(self, ws):
        with self.lock:
            if ws.role == "sim":
                self.sims.append(ws)
            elif ws.role == "pad":
                self.pads.append(ws)
            elif ws.role == "host":
                old = self.host
                self.host = ws
                if old:
                    old.close()
            elif ws.role == "guest":
                self.n += 1
                ws.id = "g%d" % self.n
                self.guests[ws.id] = ws
        if ws.role == "pad":
            self.to_sims('{"t":"pad","on":true}')
            say("● טלפון התחבר (%s)" % ws.addr, "* phone connected (%s)" % ws.addr)
        elif ws.role == "sim":
            ws.send('{"t":"pad","on":%s}' % ("true" if self.pads else "false"))
            for p in self.pads:
                p.send('{"t":"sim","on":true}')
        elif ws.role == "host":
            ws.send(json.dumps(self.info()))
            for g in self.guests.values():
                ws.send(json.dumps({"t": "gj", "id": g.id, "name": g.name}))
            say("● חדר נפתח. קוד: %s" % self.code, "* room open. code: %s" % self.code)
        elif ws.role == "guest":
            if self.host:
                self.host.send(json.dumps({"t": "gj", "id": ws.id, "name": ws.name}))
            else:
                ws.send('{"t":"nohost"}')
            say("● %s הצטרף מ-%s" % (ws.name, ws.addr), "* %s joined from %s" % (ws.name, ws.addr))

    def drop(self, ws):
        with self.lock:
            if ws in self.sims:
                self.sims.remove(ws)
            if ws in self.pads:
                self.pads.remove(ws)
            if self.host is ws:
                self.host = None
            if ws.id and self.guests.get(ws.id) is ws:
                del self.guests[ws.id]
        if ws.role == "pad" and not self.pads:
            self.to_sims('{"t":"pad","on":false}')
            say("○ הטלפון התנתק", "o phone disconnected")
        elif ws.role == "guest" and self.host:
            self.host.send(json.dumps({"t": "gl", "id": ws.id}))
            say("○ %s יצא" % ws.name, "o %s left" % ws.name)
        elif ws.role == "host":
            for g in list(self.guests.values()):
                g.send('{"t":"nohost"}')
            say("○ החדר נסגר", "o room closed")

    def route(self, ws, op, data):
        r = ws.role
        if r == "pad":
            if op == 1:
                self.to_sims(data.decode("utf-8", "replace"))
        elif r == "sim":
            if op != 1:
                return
            s = data.decode("utf-8", "replace")
            if self.pads:
                for p in list(self.pads):
                    p.send(s)
            elif '"t":"q"' in s:                      # אין טלפון — הגשר עונה לבד
                ws.send(s.replace('"t":"q"', '"t":"qr"'))
        elif r == "host":
            if op == 2:                               # מצב הזירה — לכל האורחים כמו שהוא
                for g in list(self.guests.values()):
                    g.send(data, 2)
                return
            try:
                m = json.loads(data.decode("utf-8"))
            except Exception:
                return
            if m.get("t") == "info":
                ws.send(json.dumps(self.info()))
                return
            if m.get("t") == "rekey" and ws is self.host:
                self.rekey()
                ws.send(json.dumps(self.info()))
                return
            to = m.pop("to", None)
            s = json.dumps(m, ensure_ascii=False)
            if to == "*":
                for g in list(self.guests.values()):
                    g.send(s)
            elif to in self.guests:
                g = self.guests[to]
                g.send(s)
                if m.get("t") == "deny":
                    g.close()
        elif r == "guest":
            if op != 1 or len(data) > 2000 or not data.startswith(b"{"):
                return
            if self.host:
                self.host.send('{"t":"g","id":"%s","m":%s}' % (ws.id, data.decode("utf-8", "replace")))

ROOM = None
SIM_PATH = None

def pad_page():
    ext = os.path.join(HERE, "pad.html")
    if os.path.exists(ext):                           # קובץ חיצוני קודם — משנים פריסה בלי לגעת בקוד
        with open(ext, "rb") as f:
            return f.read()
    return base64.b64decode(PAD_B64)

def sim_page(join=None):
    if not SIM_PATH or not os.path.exists(SIM_PATH):
        return None
    with open(SIM_PATH, "rb") as f:
        body = f.read()
    if join is not None:
        inj = ("<script>window.BB_JOIN={port:%d,key:%d};</script>" % (join[0], join[1])).encode()
        i = body.find(b"<head>")
        body = body[:i + 6] + inj + body[i + 6:] if i >= 0 else inj + body
    return body

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "padbridge"

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        peer = self.client_address[0]
        if not is_lan(peer):                          # רשת מקומית בלבד — אין חריגים
            return self._send(403, "LAN only")
        u = urlparse(self.path)
        q = parse_qs(u.query)
        path = u.path.rstrip("/") or "/"
        if path == "/ws":
            return self.upgrade(q, peer)
        if path == "/health":
            return self._send(200, json.dumps(ROOM.health()), "application/json")
        if path == "/":
            return self._send(200, pad_page())
        if path == "/sim":
            if not is_local(peer):
                return self._send(403, "local only")
            b = sim_page()
            return self._send(200, b) if b else self._send(404, "sim file not found")
        if path == "/join":
            try:
                k = int((q.get("k") or ["-1"])[0])
            except ValueError:
                k = -1
            if k != ROOM.key:
                return self._send(403, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>"
                                  "צריך את קוד החדר. פתח את הסימולטור והקלד אותו בלובי.")
            b = sim_page((ROOM.port, ROOM.key))
            return self._send(200, b) if b else self._send(404, "sim file not found")
        return self._send(404, "not found")

    def upgrade(self, q, peer):
        role = (q.get("role") or [""])[0]
        if role not in ("pad", "sim", "host", "guest"):
            return self._send(400, "bad role")
        if role in ("sim", "host") and not is_local(peer):
            return self._send(403, "local only")
        if role == "guest":
            try:
                k = int((q.get("k") or ["-1"])[0])
            except ValueError:
                k = -1
            if k != ROOM.key:
                return self._send(403, "bad key")
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            return self._send(400, "no key")
        acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        self.send_response(101)
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", acc)
        self.end_headers()
        self.wfile.flush()
        ws = WS(self.connection, role, peer)
        ws.name = ((q.get("n") or ["אורח"])[0])[:20]
        ROOM.add(ws)
        try:
            while ws.alive:
                op, data = ws.recv()
                ROOM.route(ws, op, data)
        except Exception:
            pass
        finally:
            ROOM.drop(ws)
            ws.close()
            self.close_connection = True

# ── צופה ADB: כל טלפון חדש מקבל adb reverse מיד ──
def find_adb():
    a = shutil.which("adb")
    if a:
        return a
    cands = []
    for env in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        if os.environ.get(env):
            cands.append(os.path.join(os.environ[env], "platform-tools"))
    home = os.path.expanduser("~")
    cands += [os.path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools"),
              os.path.join(home, "Library", "Android", "sdk", "platform-tools"),
              os.path.join(home, "Android", "Sdk", "platform-tools")]
    for c in cands:
        for n in ("adb.exe", "adb"):
            p = os.path.join(c, n)
            if os.path.exists(p):
                return p
    return None

def adb_watch(port):
    adb = find_adb()
    if not adb:
        say("אין adb — שלט הטלפון יעבוד רק דרך הרשת", "no adb found — phone pad over Wi-Fi only")
        return
    seen = set()
    flags = 0x08000000 if os.name == "nt" else 0
    while True:
        try:
            out = subprocess.run([adb, "devices"], capture_output=True, text=True, timeout=5,
                                 creationflags=flags).stdout
            now = set(l.split()[0] for l in out.splitlines()[1:] if l.strip().endswith("device"))
            for s in now - seen:
                subprocess.run([adb, "-s", s, "reverse", "tcp:%d" % port, "tcp:%d" % port],
                               capture_output=True, timeout=5, creationflags=flags)
                say("● טלפון בכבל: %s — פתח בו http://localhost:%d" % (s, port),
                    "* phone on USB: %s — open http://localhost:%d on it" % (s, port))
            seen = now
        except Exception:
            pass
        time.sleep(1.5)

def main():
    global ROOM, SIM_PATH
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9662)
    ap.add_argument("--sim", default=None)
    ap.add_argument("--no-adb", action="store_true")
    ap.add_argument("--key", type=int, default=None)
    a = ap.parse_args()
    if a.sim:
        SIM_PATH = os.path.abspath(a.sim)
    else:
        for n in ("BIOBUZZ-lab.html", "biobuzz-sim.html"):
            if os.path.exists(os.path.join(HERE, n)):
                SIM_PATH = os.path.join(HERE, n)
                break
    ROOM = Room(a.port, load_key(a.key))
    srv = ThreadingHTTPServer(("0.0.0.0", a.port), H)
    srv.daemon_threads = True
    say("═" * 52, "=" * 52)
    say(" גשר BIOBUZZ · אפולו 9662 · פורט %d" % a.port, " BIOBUZZ bridge · Apollo 9662 · port %d" % a.port)
    say("═" * 52, "=" * 52)
    say(" סימולטור במחשב הזה:  http://localhost:%d/sim" % a.port, " simulator here:  http://localhost:%d/sim" % a.port)
    if not SIM_PATH:
        say("   (לא נמצא BIOBUZZ-lab.html ליד הגשר)", "   (BIOBUZZ-lab.html not found next to the bridge)")
    if ROOM.lan:
        say(" קוד חדר:              %s" % ROOM.code, " room code:        %s" % ROOM.code)
        say(" הצטרפות ממחשב אחר:   %s" % ROOM.join_url(), " join from LAN:    %s" % ROOM.join_url())
        say(" שלט טלפון בוויי-פיי:  http://%s:%d" % (ROOM.lan[0], a.port), " phone over Wi-Fi: http://%s:%d" % (ROOM.lan[0], a.port))
    else:
        say(" לא נמצאה רשת מקומית — משחק ברשת לא זמין", " no LAN found — network play unavailable")
    say(" רשת מקומית בלבד. Ctrl+C לסגירה.", " LAN only. Ctrl+C to quit.")
    if not a.no_adb:
        threading.Thread(target=adb_watch, args=(a.port,), daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        say("\nנסגר.", "\nbye.")

if __name__ == "__main__":
    main()
