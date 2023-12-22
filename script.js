(function () {
    const BOARD = document.getElementById("board");
    let BOARD_2D = undefined;

    let BOARD_UNDO_REDO_EVENT_STORE = [];
    let BOARD_UNDO_REDO_PTR = 0;

    let BOARD_RECORDING_EVENT_STORE = [];
    let BOARD_RECORDER_REPLAY_ENABLED = false;

    let BRUSH_SIZE = 1;
    let BRUSH_COLOR = "#000000";
    let BRUSH_ENABLED_COUNTER = 0;
    let EPOCH = 0;

    let BRUSH_OPTIONS_WINDOW_OPEN = false;
    let GRID_OPTIONS_WINDOW_OPEN = false;
    let EXTRA_OPTIONS_WINDOW_OPEN = false;
    let CREDITS_WINDOW_OPEN = false;

    document.addEventListener("click", (e) => {
        if (BRUSH_OPTIONS_WINDOW_OPEN) {
            let brushOuterContainer = document.getElementById("brush-outer-container");
            if (!brushOuterContainer.contains(e.target)) {
                BRUSH_OPTIONS_WINDOW_OPEN = false;
                document.getElementById("brush-dropdown-options-container").style.display = "none";
            }
        }

        if (GRID_OPTIONS_WINDOW_OPEN) {
            let gridOuterContainer = document.getElementById("grid-size-btn-container");
            if (!gridOuterContainer.contains(e.target)) {
                GRID_OPTIONS_WINDOW_OPEN = false;
                document.getElementById("gs-container").style.display = "none";
            }
        }

        if (EXTRA_OPTIONS_WINDOW_OPEN) {
            let extraOptionsOuterContainer = document.getElementById("extra-options-outer-container");
            if (!extraOptionsOuterContainer.contains(e.target)) {
                EXTRA_OPTIONS_WINDOW_OPEN = false;
                document.getElementById("options-container").style.display = "none";
            }
        }

        if (CREDITS_WINDOW_OPEN) {
            let creditsContainer = document.getElementById("credits-container");
            let creditsOptionBtn = document.getElementById("credits");
            if (!(creditsContainer.contains(e.target) || creditsOptionBtn.contains(e.target))) {
                CREDITS_WINDOW_OPEN = false;
                document.getElementById("credits-dropdown-options-container").style.display = "none";
            }
        }
    })

    plotBoard(16);
    updateBrushColor();

    for (let favColorInput of document.getElementsByClassName("fav_color")) {
        favColorInput.style.backgroundColor = favColorInput.value;
        favColorInput.addEventListener("mouseenter", (e) => {
            e.target.style.backgroundColor = e.target.value;
            BRUSH_COLOR = e.target.value;
            updateBrushColor();
        });

        favColorInput.addEventListener("change", (e) => {
            BRUSH_COLOR = e.target.value;
            updateBrushColor();
        });

        favColorInput.addEventListener("input", (e) => {
            e.target.style.backgroundColor = e.target.value;
        });
    }

    document.getElementById("brush-btn").addEventListener("click", () => {
        if (BRUSH_OPTIONS_WINDOW_OPEN) {
            document.getElementById("brush-dropdown-options-container").style.display = 'none';
        } else {
            document.getElementById("brush-dropdown-options-container").style.display = 'block';
        }

        BRUSH_OPTIONS_WINDOW_OPEN = !BRUSH_OPTIONS_WINDOW_OPEN;
    })

    document.getElementById("brush-dropdown-options-container").addEventListener("click", (e) => {
        switch (e.target.id) {
            case "brush-tiny": {
                BRUSH_SIZE = 1;
                break;
            }
            case "brush-medium": {
                BRUSH_SIZE = 2;
                break;
            }
            case "brush-large": {
                BRUSH_SIZE = 3;
                break;
            }
        }

        document.getElementById("brush-dropdown-options-container").style.display = 'none';
        BRUSH_OPTIONS_WINDOW_OPEN = false;
    });

    document.getElementById("rubber-btn-container").addEventListener("click", () => {
        BRUSH_COLOR = "#FFFAFAFF";
        updateBrushColor();
    });

    document.getElementById("gs-icon").addEventListener("click", () => {
        if (GRID_OPTIONS_WINDOW_OPEN) {
            document.getElementById("gs-container").style.display = "none";
        } else {
            document.getElementById("gs-container").style.display = "block";
        }

        GRID_OPTIONS_WINDOW_OPEN = !GRID_OPTIONS_WINDOW_OPEN;
    });

    for (let gsElement of document.getElementsByClassName("gs-dropdown-option")) {
        gsElement.addEventListener("click", (e) => {
            if (!BOARD_RECORDER_REPLAY_ENABLED) {
                let option = e.target.textContent;
                if (option === "Basic") {
                    clearBoard()
                    plotBoard(16);
                } else if (option === "Medium") {
                    clearBoard()
                    plotBoard(64);
                } else {
                    clearBoard()
                    plotBoard(128);
                }
            }

            document.getElementById("gs-container").style.display = "none";
        });
    }

    document.getElementById("options-icon").addEventListener("click", () => {
        if (EXTRA_OPTIONS_WINDOW_OPEN) {
            document.getElementById("options-container").style.display = "none";
        } else {
            document.getElementById("options-container").style.display = "block";
        }

        EXTRA_OPTIONS_WINDOW_OPEN = !EXTRA_OPTIONS_WINDOW_OPEN;
    });

    document.getElementById("options-dropdown-options-container").addEventListener("click", (e) => {
        if (BOARD_RECORDER_REPLAY_ENABLED) {
            return;
        }

        switch (e.target.id) {
            case "replay": {
                BOARD_RECORDER_REPLAY_ENABLED = true;

                for (let i = BOARD_RECORDING_EVENT_STORE.length - 1; i >= 0; i--) {
                    BOARD_RECORDING_EVENT_STORE[i].revert();
                }

                function sleep(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                async function replayEvents() {
                    for (let i = 0; i < BOARD_RECORDING_EVENT_STORE.length; i++) {
                        if (i < BOARD_RECORDING_EVENT_STORE.length - 1) {
                            await sleep(Math.min(
                                BOARD_RECORDING_EVENT_STORE[i + 1].timestamp - BOARD_RECORDING_EVENT_STORE[i].timestamp,
                                234
                            ));
                        }

                        BOARD_RECORDING_EVENT_STORE[i].apply();
                    }
                }

                replayEvents().finally(() => {
                    BOARD_RECORDER_REPLAY_ENABLED = false;
                })

                break
            }
            case "save": {
                const canvas = document.createElement("canvas");
                let factor = 1;

                switch (BOARD_2D.length) {
                    case 16: {
                        factor = 16;
                        break;
                    }
                    case 64: {
                        factor = 8;
                        break;
                    }
                    case 128: {
                        factor = 4;
                        break;
                    }
                }

                canvas.width = BOARD_2D.length * factor;
                canvas.height = BOARD_2D[0].length * factor;
                const ctx = canvas.getContext("2d");

                for (let i = 0; i < BOARD_2D.length; i++) {
                    const rowGroup = BOARD_2D[i];
                    for (let j = 0; j < rowGroup.length; j++) {
                        const box = rowGroup[j];
                        ctx.fillStyle = box.style.backgroundColor;
                        ctx.fillRect(j * factor, i * factor, factor, factor);
                    }
                }

                const link = document.createElement("a")
                link.download = "Art.png";
                link.href = canvas.toDataURL("image/png");
                link.click();
                break;
            }
            case "erase": {
                BOARD_UNDO_REDO_PTR = 0;
                BOARD_UNDO_REDO_EVENT_STORE = [];
                BOARD_RECORDING_EVENT_STORE = [];
                for (let box of document.getElementsByClassName('box')) {
                    box.style.backgroundColor = "#FFFAFAFF";
                }
                break;
            }
            case "credits": {
                document.getElementById("options-container").style.display = "none";
                EXTRA_OPTIONS_WINDOW_OPEN = false;
                document.getElementById("credits-dropdown-options-container").style.display = "block";
                CREDITS_WINDOW_OPEN = true;
                break;
            }
        }

        EXTRA_OPTIONS_WINDOW_OPEN = false;
        document.getElementById("options-container").style.display = "none";
    });

    window.addEventListener("mousedown", (e) => {
        BRUSH_ENABLED_COUNTER++;
        if (e.target.hasAttribute("coordinates") && !BOARD_RECORDER_REPLAY_ENABLED) {
            EPOCH++;
            paint(e.target);
        }
    });

    window.addEventListener("mouseup", () => {
        BRUSH_ENABLED_COUNTER--;
    });

    document.getElementById("undo-icon").addEventListener("click", (e) => {
        e.target.style.transform = "scale(1.2)";

        if (BOARD_UNDO_REDO_PTR > 0 && !BOARD_RECORDER_REPLAY_ENABLED) {
            const eventGroupTail = BOARD_UNDO_REDO_EVENT_STORE[BOARD_UNDO_REDO_PTR - 1];
            const tailEpoch = eventGroupTail.epoch;
            for (let i = BOARD_UNDO_REDO_PTR - 1; i >= 0; i--) {
                const event = BOARD_UNDO_REDO_EVENT_STORE[i];
                if (event.epoch === tailEpoch) {
                    if (i === 0) {
                        BOARD_UNDO_REDO_PTR = 0;
                    }

                    BOARD_RECORDING_EVENT_STORE.push(
                        new Event(
                            new InversedModificationEvent(event.applier),
                            CELL_STYLE_MODIFICATION_EVENT,
                            Date.now(),
                            -1
                        )
                    );

                    event.revert();
                } else {
                    BOARD_UNDO_REDO_PTR = i + 1;
                    break;
                }
            }
        }

        setTimeout(() => {
            e.target.style.transform = "";
        }, 382);
    });

    document.getElementById("redo-icon").addEventListener("click", (e) => {
        e.target.style.transform = "scale(1.2)";

        if (BOARD_UNDO_REDO_EVENT_STORE.length > BOARD_UNDO_REDO_PTR && !BOARD_RECORDER_REPLAY_ENABLED) {
            const eventGroupHead = BOARD_UNDO_REDO_EVENT_STORE[BOARD_UNDO_REDO_PTR];
            const headEpoch = eventGroupHead.epoch;
            for (let i = BOARD_UNDO_REDO_PTR; i < BOARD_UNDO_REDO_EVENT_STORE.length; i++) {
                const event = BOARD_UNDO_REDO_EVENT_STORE[i];
                if (event.epoch === headEpoch) {
                    if (i === BOARD_UNDO_REDO_EVENT_STORE.length - 1) {
                        BOARD_UNDO_REDO_PTR = BOARD_UNDO_REDO_EVENT_STORE.length;
                    }

                    BOARD_RECORDING_EVENT_STORE.push(
                        new Event(
                            event.applier,
                            CELL_STYLE_MODIFICATION_EVENT,
                            Date.now(),
                            -1
                        )
                    );

                    event.apply();
                } else {
                    BOARD_UNDO_REDO_PTR = i;
                    break;
                }
            }
        }

        setTimeout(() => {
            e.target.style.transform = "";
        }, 382);
    });

    document.getElementById("credits-dropdown-options-container").addEventListener("click", (e) => {
        let creditOptionSelected = false;
        switch (e.target.id) {
            case "credits-arrow-right": {
                window.open("https://www.svgrepo.com/svg/521967/arrow-right-square");
                creditOptionSelected = true;
                break;
            }
            case "credits-arrow-left": {
                window.open("https://www.svgrepo.com/svg/521960/arrow-left-square");
                creditOptionSelected = true;
                break;
            }
            case "credits-settings": {
                window.open("https://www.svgrepo.com/svg/435417/settings");
                creditOptionSelected = true;
                break;
            }
            case "credits-hash-straight": {
                window.open("https://www.svgrepo.com/svg/364576/hash-straight-fill");
                creditOptionSelected = true;
                break;
            }
            case "credits-paint-brush": {
                window.open("https://www.svgrepo.com/svg/362927/paint-brush-bold");
                creditOptionSelected = true;
                break;
            }
            case "credits-rubber": {
                window.open("https://www.svgrepo.com/svg/360708/rubber");
                creditOptionSelected = true;
                break;
            }
        }

        if (creditOptionSelected) {
            CREDITS_WINDOW_OPEN = false;
            document.getElementById("credits-dropdown-options-container").style.display = "none";
        }
    });

    function plotBoard(dim) {
        const fragment = document.createDocumentFragment();
        const board2D = [];
        const rowGroupHeight = BOARD.offsetWidth / window.innerWidth / dim * 100;

        for (let i = 0; i < dim; i++) {
            const vertical = [];

            const rowGroup = document.createElement("div");
            rowGroup.classList.add("row");
            rowGroup.style.height = `${rowGroupHeight}vw`;

            for (let j = 0; j < dim; j++) {
                const box = document.createElement("div");
                box.setAttribute("coordinates", `${i},${j}`);
                box.classList.add("box");

                box.style.backgroundColor = "#FFFAFAFF";
                attachBoxEventListener(box, board2D);

                rowGroup.appendChild(box);
                vertical.push(box);
            }

            fragment.appendChild(rowGroup);
            board2D.push(vertical);
        }

        BOARD.appendChild(fragment);
        BOARD_2D = board2D;
    }

    function clearBoard() {
        BOARD_UNDO_REDO_PTR = 0;
        BOARD_UNDO_REDO_EVENT_STORE = [];
        BOARD_RECORDING_EVENT_STORE = [];

        while (BOARD.firstChild) {
            BOARD.removeChild(BOARD.firstChild);
        }
    }

    function attachBoxEventListener(box) {
        box.addEventListener("mouseover", function (e) {
            paint(e.target);
        });
    }

    function applyStyle(cell) {
        if (cell !== undefined) {
            let brushColor = BRUSH_COLOR;

            let applier = new CellStyleModificationEvent(
                cell.coordinates,
                new BackgroundColorModificationEvent(
                    cell.htmlElement.style.backgroundColor,
                    brushColor,
                )
            );

            const event = new Event(applier, CELL_STYLE_MODIFICATION_EVENT, Date.now(), EPOCH);
            while (BOARD_UNDO_REDO_PTR < BOARD_UNDO_REDO_EVENT_STORE.length) {
                BOARD_UNDO_REDO_EVENT_STORE.pop();
            }

            BOARD_UNDO_REDO_EVENT_STORE.push(event);
            BOARD_UNDO_REDO_PTR = BOARD_UNDO_REDO_EVENT_STORE.length;

            BOARD_RECORDING_EVENT_STORE.push(event);

            cell.htmlElement.style.backgroundColor = brushColor;
        }
    }

    function paint(target) {
        if (BRUSH_ENABLED_COUNTER === 0) {
            return;
        }

        const coordinates = target.getAttribute("coordinates").split(",");
        const x = parseInt(coordinates[0]);
        const y = parseInt(coordinates[1]);

        if (BRUSH_SIZE === 1) {
            applyStyle(getCell(BOARD_2D, x, y));
        } else {
            const square = BRUSH_SIZE - 1;

            const x_start = x - square;
            const y_start = y - square;

            const x_end = x + square + 1;
            const y_end = y + square + 1;

            for (let i = x_start; i < x_end; i++) {
                for (let j = y_start; j < y_end; j++) {
                    applyStyle(getCell(BOARD_2D, i, j));
                }
            }

            applyStyle(getCell(BOARD_2D, x - BRUSH_SIZE, y));
            applyStyle(getCell(BOARD_2D, x + BRUSH_SIZE, y));
            applyStyle(getCell(BOARD_2D, x, y - BRUSH_SIZE));
            applyStyle(getCell(BOARD_2D, x, y + BRUSH_SIZE));
        }
    }

    function getCell(board2D, x, y) {
        try {
            return {
                htmlElement: board2D[x][y],
                coordinates: new Coordinates(x, y),
            };
        } catch (e) {
            return undefined;
        }
    }

    function updateBrushColor() {
        let brushBtnContainer = document.getElementById("brush-btn-container");
        if (BRUSH_COLOR.startsWith("#")) {
            let color = BRUSH_COLOR.replace('#', '');
            const r = parseInt(color.substring(0, 2), 16);
            const g = parseInt(color.substring(2, 4), 16);
            const b = parseInt(color.substring(4, 6), 16);
            brushBtnContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
        } else if (BRUSH_COLOR.startsWith("rgb")) {
            let rgbRegExp = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/;
            let matches = rgbRegExp.exec(BRUSH_COLOR);
            if (matches == null) {
                console.error("Couldn't update paint color");
            } else {
                let r = matches[1];
                let g = matches[2];
                let b = matches[3];
                brushBtnContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            }
        } else if (BRUSH_COLOR.startsWith("rgba")) {
            let rgbaRegExp = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)\)$/;
            let matches = rgbaRegExp.exec(BRUSH_COLOR);
            if (matches == null) {
                console.error("Couldn't update paint color");
            } else {
                let r = matches[1];
                let g = matches[2];
                let b = matches[3];
                brushBtnContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            }
        } else {
            console.error("Couldn't update paint color");
        }
    }

    const CELL_STYLE_MODIFICATION_EVENT = "CELL_STYLE_MODIFICATION_EVENT";

    class Event {
        constructor(applier, kind, timestamp, epoch) {
            this.applier = applier;
            this.kind = kind;
            this.timestamp = timestamp;
            this.epoch = epoch;
        }

        apply() {
            this.applier.apply();
        }

        revert() {
            this.applier.revert();
        }
    }

    class InversedModificationEvent {
        constructor(applier) {
            this.applier = applier;
        }

        apply() {
            this.applier.revert();
        }

        revert() {
            this.applier.apply();
        }
    }

    class Coordinates {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    class CellStyleModificationEvent {
        constructor(coordinates, htmlElementModificationEvent) {
            this.coords = coordinates;
            this.htmlElementModificationEvent = htmlElementModificationEvent;
        }

        apply() {
            let cell = BOARD_2D[this.coords.x][this.coords.y];
            this.htmlElementModificationEvent.apply(cell);
        }

        revert() {
            let cell = BOARD_2D[this.coords.x][this.coords.y];
            this.htmlElementModificationEvent.revert(cell);
        }
    }

    class BackgroundColorModificationEvent {
        constructor(oldColor, newColor) {
            this.oldColor = oldColor;
            this.newColor = newColor;
        }

        apply(htmlElement) {
            htmlElement.style.backgroundColor = this.newColor;
        }

        revert(htmlElement) {
            htmlElement.style.backgroundColor = this.oldColor;
        }
    }
})();
