# Third-party notices

**Version:** 2026-10-09

BIOBUZZ is built with open-source software and fonts made by other people. We are grateful to their authors. This page lists each component, its copyright notice and the full text of its licence, as those licences require. These licences apply to the components listed here, not to BIOBUZZ as a whole.

---

## Where each component is used

- **Simulator** (inside the desktop app and the single-file browser version): three.js r128 including its GLTFLoader, STLLoader, OBJLoader examples; cannon.js 0.6.2; meshoptimizer decoder 0.14; QR Code Generator for JavaScript; the Rubik, Secular One and IBM Plex Mono fonts. In the distributed builds, these are embedded in the file, so nothing is downloaded from outside servers.
- **Desktop app:** Electron 38.2.0 (which includes Chromium, Node.js and other components), electron-updater and its dependencies, and ws.
- **Installers:** built with electron-builder; the Windows installer uses NSIS.
- **Phone bridge (padbridge.py):** uses only the Python standard library.

## Chromium and Electron's bundled components

Electron includes Chromium, Node.js, V8 and many other open-source components, each with its own licence. Their full notices ship with the desktop app in the file **LICENSES.chromium.html** (in the app's installation folder, next to the program), and Electron's own licence is in the file **LICENSE** in the same folder. They are also available from the [Electron project](https://github.com/electron/electron).

## Official field model (CAD)

The 3D field model shown in the simulator is the official field CAD model for the 2026–2027 FIRST® Tech Challenge season (Onshape document "am-5850 BIOBUZZ"), which belongs to its owners (FIRST and/or the field supplier). It is used only to visualise the field: we converted it to a compressed glTF format (with glTF-Transform and meshoptimizer) and split it into three parts (static field, red and blue goals), without changing its design. It is not covered by any licence we give for BIOBUZZ, and it may not be extracted and reused. The simulator also works without it, using its own simplified field.

FIRST®, FIRST® Tech Challenge and the game name BIOBUZZ (the 2026–2027 FIRST Tech Challenge game) are trademarks of FIRST (For Inspiration and Recognition of Science and Technology); this is an independent team project, not affiliated with, endorsed by or sponsored by FIRST; FIRST is not overseeing, involved with, or responsible for this software.

---

## Components under the MIT License

Each of the following components is licensed under the MIT License, with the copyright notice shown. The full licence text follows the list.

- **three.js r128** (including the GLTFLoader, STLLoader and OBJLoader examples) — Copyright © 2010-2021 three.js authors. [github.com/mrdoob/three.js](https://github.com/mrdoob/three.js)
- **cannon.js 0.6.2** — Copyright (c) 2015 cannon.js Authors. [github.com/schteppe/cannon.js](https://github.com/schteppe/cannon.js)
- **meshoptimizer decoder 0.14** — Copyright (C) 2016-2020, by Arseny Kapoulkine (arseny.kapoulkine@gmail.com). [github.com/zeux/meshoptimizer](https://github.com/zeux/meshoptimizer)
- **QR Code Generator for JavaScript** — Copyright (c) 2009 Kazuhiko Arase. [github.com/kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
- **Electron 38.2.0** — Copyright (c) Electron contributors; Copyright (c) 2013-2020 GitHub Inc. [github.com/electron/electron](https://github.com/electron/electron)
- **electron-updater 6.8.9** and **builder-util-runtime 9.7.0** — Copyright (c) 2015 Loopline Systems.
- **electron-builder 26.0.12** (used to build the installers) — Copyright (c) 2015 Loopline Systems.
- **ws 8.22.0** — Copyright (c) 2011 Einar Otto Stangvik; Copyright (c) 2013 Arnout Kazemier and contributors; Copyright (c) 2016 Luigi Pinca and contributors.
- **debug 4.4.3** — Copyright (c) 2014-2017 TJ Holowaychuk; Copyright (c) 2018-2021 Josh Junon.
- **ms 2.1.3** — Copyright (c) 2020 Vercel, Inc.
- **fs-extra 10.1.0** — Copyright (c) 2011-2017 JP Richardson.
- **jsonfile 6.2.1** — Copyright (c) 2012-2015, JP Richardson.
- **universalify 2.0.1** — Copyright (c) 2017, Ryan Zimmerman.
- **js-yaml 4.3.2** — Copyright (C) 2011-2015 by Vitaly Puzrin.
- **lazy-val 1.0.5** — Copyright (c) Vladimir Krivosheev.
- **lodash.escaperegexp 4.1.2** — Copyright jQuery Foundation and other contributors; based on Underscore.js, copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors.
- **lodash.isequal 4.5.0** — Copyright JS Foundation and other contributors; based on Underscore.js, copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors.
- **tiny-typed-emitter 2.1.0** — Copyright (c) 2020 Zurab Benashvili (binier).

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Components under the ISC License

- **semver 7.7.4** — Copyright (c) Isaac Z. Schlueter and Contributors.
- **graceful-fs 4.2.11** — Copyright (c) 2011-2022 Isaac Z. Schlueter, Ben Noordhuis, and Contributors.

### ISC License

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

## Components under the Blue Oak Model License 1.0.0

- **sax 1.6.1** — by Isaac Z. Schlueter and contributors.

### Blue Oak Model License, Version 1.0.0

Version 1.0.0

**Purpose**

This license gives everyone as much permission to work with this software as possible, while protecting contributors from liability.

**Acceptance**

In order to receive this license, you must agree to its rules.  The rules of this license are both obligations under that agreement and conditions to your license. You must not do anything with this software that triggers a rule that you cannot or will not follow.

**Copyright**

Each contributor licenses you to do everything with this software that would otherwise infringe that contributor's copyright in it.

**Notices**

You must ensure that everyone who gets a copy of any part of this software from you, with or without changes, also gets the text of this license or a link to [blueoakcouncil.org/license/1.0.0](https://blueoakcouncil.org/license/1.0.0).

**Excuse**

If anyone notifies you in writing that you have not complied with Notices, you can keep your license by taking all practical steps to comply within 30 days after the notice.  If you do not do so, your license ends immediately.

**Patent**

Each contributor licenses you to do everything with this software that would otherwise infringe any patent claims they can license or become able to license.

**Reliability**

No contributor can revoke this license.

**No Liability**

**As far as the law allows, this software comes as is, without any warranty or condition, and no contributor will be liable to anyone for any damages related to this software or this license, under any kind of legal claim.**

---

## Components under the Python Software Foundation License

- **argparse 2.0.1** (a JavaScript port of Python's argparse, used by js-yaml) — Copyright (c) 2001-2020 Python Software Foundation; All Rights Reserved. The complete licence, including the history of the software and the BeOpen, CNRI and CWI agreements, is in the package and at [github.com/nodeca/argparse](https://github.com/nodeca/argparse/blob/master/LICENSE).

### Python Software Foundation License Version 2

1. This LICENSE AGREEMENT is between the Python Software Foundation ("PSF"), and the Individual or Organization ("Licensee") accessing and otherwise using this software ("Python") in source or binary form and its associated documentation.

2. Subject to the terms and conditions of this License Agreement, PSF hereby grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce, analyze, test, perform and/or display publicly, prepare derivative works, distribute, and otherwise use Python alone or in any derivative version, provided, however, that PSF's License Agreement and PSF's notice of copyright, i.e., "Copyright (c) 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020 Python Software Foundation; All Rights Reserved" are retained in Python alone or in any derivative version prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on or incorporates Python or any part thereof, and wants to make the derivative work available to others as provided herein, then Licensee hereby agrees to include in any such work a brief summary of the changes made to Python.

4. PSF is making Python available to Licensee on an "AS IS" basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON WILL NOT INFRINGE ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON, OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any relationship of agency, partnership, or joint venture between PSF and Licensee.  This License Agreement does not grant permission to use PSF trademarks or trade name in a trademark sense to endorse or promote products or services of Licensee, or any third party.

8. By copying, installing or otherwise using Python, Licensee agrees to be bound by the terms and conditions of this License Agreement.

---

## NSIS (Windows installer)

The Windows installer is created with NSIS (Nullsoft Scriptable Install System). Copyright (C) 1999 and later, NSIS Contributors. NSIS is licensed under the zlib/libpng license:

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.

---

## Fonts under the SIL Open Font License 1.1

The following fonts are embedded in the simulator. They are licensed under the SIL Open Font License, Version 1.1, whose full text follows. The font files are included as distributed by Google Fonts (split into language subsets by Google Fonts); we have not modified them.

- **Rubik** — Copyright 2015 The Rubik Project Authors ([github.com/googlefonts/rubik](https://github.com/googlefonts/rubik)).
- **Secular One** — Copyright 2016 The Secular One Project Authors ([github.com/googlefonts/secular](https://github.com/googlefonts/secular)).
- **IBM Plex Mono** — Copyright © 2017 IBM Corp. with Reserved Font Name "Plex".

### SIL Open Font License, Version 1.1

SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

**PREAMBLE**

The goals of the Open Font License (OFL) are to stimulate worldwide development of collaborative font projects, to support the font creation efforts of academic and linguistic communities, and to provide a free and open framework in which fonts may be shared and improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves. The fonts, including any derivative works, can be bundled, embedded, redistributed and/or sold with any software provided that any reserved names are not used by derivative works. The fonts and derivatives, however, cannot be released under any other type of license. The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives.

**DEFINITIONS**

"Font Software" refers to the set of files released by the Copyright Holder(s) under this license and clearly marked as such. This may include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the copyright statement(s).

"Original Version" refers to the collection of Font Software components as distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting, or substituting -- in part or in whole -- any of the components of the Original Version, by changing formats or by porting the Font Software to a new environment.

"Author" refers to any designer, engineer, programmer, technical writer or other person who contributed to the Font Software.

**PERMISSION & CONDITIONS**

Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled, redistributed and/or sold with any software, provided that each copy contains the above copyright notice and this license. These can be included either as stand-alone text files, human-readable headers or in the appropriate machine-readable metadata fields within text or binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font Name(s) unless explicit written permission is granted by the corresponding Copyright Holder. This restriction only applies to the primary font name as presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font Software shall not be used to promote, endorse or advertise any Modified Version, except to acknowledge the contribution(s) of the Copyright Holder(s) and the Author(s) or with their explicit written permission.

5) The Font Software, modified or unmodified, in part or in whole, must be distributed entirely under this license, and must not be distributed under any other license. The requirement for fonts to remain under this license does not apply to any document created using the Font Software.

**TERMINATION**

This license becomes null and void if any of the above conditions are not met.

**DISCLAIMER**

THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.
