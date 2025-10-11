import './styles.css';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../node_modules/tabulator-tables/dist/css/tabulator_bootstrap5.min.css';

import { CellComponent, EditModule, FilterModule, FormatModule, InteractionModule, PopupModule, ResizeColumnsModule, ResizeTableModule, ResponsiveLayoutModule, SortModule, Tabulator, TooltipModule } from 'tabulator-tables';

type logoDataType = {
	logohandle: string;
	name: string;
	sort: string;
	website: string;
	ar21: boolean;
	icon: boolean;
	tile: boolean;
	tags: Map<string, string>;

	// social fields
};

type SocialMedia = {
	id: string;
  	iconhtml: string;
  	logohandle: string;
  	pattern: string;
}

type SocialMediaApi = {
	success: boolean;
	data: { sites: SocialMedia[]; };
}

const dataUrl = "https://www.vectorlogo.zone/util/apiall.json";  // for local testing


var rowPopupFormatter = function (e: any, row: any, onRendered: any) {
	var data = row.getData() as logoDataType;
	var container = document.createElement("div"),

		contents = "<strong style='font-size:1.2em;'>SQL INSERT</strong><br/>";
	contents += `<pre class="m-3">`;
	contents += data.logohandle;    // LATER: logo image
	contents += `</pre>`

	container.innerHTML = contents;

	window?.getSelection()?.removeAllRanges();

	return container;
};

function websiteLabeler(cell: any) {
	var value = cell.getValue();
	if (!value) return "";

	if (value.startsWith("http://")) {
		value = value.substring(7);
	} else if (value.startsWith("https://")) {
		value = value.substring(8);
	}
	if (value.startsWith("www.")) {
		value = value.substring(4);
	}
	if (value.endsWith("/") && value.indexOf("/") === value.length - 1) {
		value = value.slice(0, -1);
	}
	return value;
}

function imgTooltipFn(imgType:string) {

	return function (e: MouseEvent, cell: CellComponent, onRendered: any) {
		var value = cell.getValue();
		if (!value) {
			return "n/a";
		}

		const handle = cell.getRow().getData().logohandle;

		const el = document.createElement("img");
		el.src = `https://www.vectorlogo.zone/logos/${handle}/${handle}-${imgType}.svg`;
		el.style.height = "256px"

		return el;
	}
}

function imgClickFn(imgType:string, extraParams:string) {

	return function (e: UIEvent, cell: CellComponent) {
		var value = cell.getValue();
		if (!value) {
			return;
		}

		const handle = cell.getRow().getCell("logohandle").getValue();

		const url = `https://svg-viewer.fileformat.info/view.html?url=https://www.vectorlogo.zone/logos/${handle}/${handle}-${imgType}.svg&backUrl=https://www.vectorlogo.zone/logos/${handle}/${extraParams}`;
		window.open(url, '_blank')?.focus();
	}
}

function showError(msg: string) {
	console.log(`ERROR: ${msg}`);
	document.getElementById('loading')!.classList.add('d-none');
	document.getElementById('errdiv')!.classList.remove('d-none');
	document.getElementById('errmsg')!.innerHTML = msg;
}


function hasImage(suffix: string, images?: string[]) {
	if (!images || images.length === 0) {
		return false;
	}

	for (const img of images) {
		if (img.endsWith(suffix)) {
			return true;
		}
	}
	return false;
}

function tagFormatter(cell: CellComponent) {
	const tags = cell.getValue() as Map<string, string>;
	if (!tags || tags.size === 0) {
		return "";
	}

	const container = document.createElement("div");

	const keys = Array.from(tags.keys()).sort();

	for (const key of keys) {
		const value = tags.get(key) || "";
		var el = document.createElement("a");
		el.href = value;
		el.className = "badge bg-secondary me-1 mb-1 text-decoration-none";
		el.target = "_blank";
		el.textContent = key;
		container.appendChild(el);
	}

	return container;
}

function makeTagMap(row: any, socialmedia: SocialMedia[]): Map<string, string> {
	const tagMap = new Map<string, string>();

	tagMap.set("website", row.website);

	for (const sm of socialmedia) {
		if (row[sm.id]) {
			tagMap.set(sm.id, row[sm.id]);
		}
	}

	return tagMap;
}

function nameFilter(headerValue: string, sortValue: string, rowData: any, filterParams: any) {
	if (!headerValue) return true;
	if (!sortValue) return false;

	const rowValue = rowData.name;

	if (headerValue.length == 1) {
		// single character, do starts with
		const search = headerValue.toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("^")) {
		// starts with
		const search = headerValue.substring(1).toLowerCase();
		return rowValue.toLowerCase().startsWith(search);
	}

	if (headerValue.startsWith("/") && headerValue.endsWith("/")) {
		// regex
		const pattern = headerValue.substring(1, headerValue.length - 1);
		try {
			const re = new RegExp(pattern, "i");
			return re.test(rowValue);
		} catch (e) {
			// bad regex
			return false;
		}
	}

	// contains
	const search = headerValue.toLowerCase();
	return rowValue.toLowerCase().includes(search);
}

async function main() {

	let socialmedia: SocialMedia[];
	try {
		const resp = await fetch("https://www.vectorlogo.zone/util/socialmedia.json", {
			method: 'GET',
			redirect: 'follow',
		});
		if (!resp.ok) {
			showError(`HTTP Error fetching social media data: ${resp.status} ${resp.statusText}`);
			return;
		}
		var apiData = (await resp.json()) as SocialMediaApi;
		if (!apiData.success) {
			showError(`Error in social media data response`);
			return;
		}
		socialmedia = apiData.data.sites;
	} catch (error) {
		showError(`Error fetching social media data: ${error}`);
		return;
	}

	let rawData: any;
	try {
		const resp = await fetch(dataUrl, {
			method: 'GET',
			redirect: 'follow',
		});
		if (!resp.ok) {
			showError(`HTTP Error fetching logo data: ${resp.status} ${resp.statusText}`);
			return;
		}
		rawData = await resp.json();
	} catch (error) {
		showError(`Error fetching logo data: ${error}`);
		return;
	}

	console.log(rawData[0]);

	const data: logoDataType[] = [];
	for (const row of rawData) {
		if (row.logohandle == "microsoft") {
			console.log(row);
		}
		data.push({
			logohandle: row.logohandle,
			name: row.title,
			sort: row.sort,
			website: row.website,
			ar21: hasImage("-ar21.svg", row.images),
			icon: hasImage("-icon.svg", row.images),
			tile: hasImage("-tile.svg", row.images),
			tags: makeTagMap(row, socialmedia),
		});
	}

	Tabulator.registerModule([EditModule, FilterModule, FormatModule, InteractionModule, PopupModule, ResizeColumnsModule, ResizeTableModule, ResponsiveLayoutModule, SortModule, TooltipModule]);

	const table = new Tabulator("#achtable", {
		autoResize: true,
		data,
		columns: [
			{
				cellDblClick: imgClickFn("ar21", "&zoom=4"),
				field: "ar21",
				formatter: "tickCross",
				formatterParams: {
					crossElement: false,
				},
				hozAlign: "center",
				headerFilter: "tickCross",
				headerFilterParams: { defaultValue: "true", tristate: true },
				headerHozAlign: "center",
				headerSort: false,
				responsive: 2,
				title: "2:1",
				tooltip: imgTooltipFn("ar21"),
				width: 100,
			},
			{
				cellDblClick: imgClickFn("icon", "&zoom=icons"),
				field: "icon",
				formatter: "tickCross",
				formatterParams: { crossElement: false },
				hozAlign: "center",
				headerFilter: "tickCross",
				headerFilterParams: { tristate: true },
				headerHozAlign: "center",
				headerSort: false,
				responsive: 2,
				title: "Icon",
				tooltip: imgTooltipFn("icon"),
				width: 100,
			},
			{
				cellDblClick: imgClickFn("tile", "&zoom=max"),
				field: "tile",
				formatter: "tickCross",
				formatterParams: {
					crossElement: false,
				},
				hozAlign: "center",
				headerFilter: "tickCross",
				headerFilterParams: { tristate: true },
				headerHozAlign: "center",
				headerSort: false,
				responsive: 2,
				title: "2:1",
				tooltip: imgTooltipFn("tile"),
				width: 100,
			},
			{
				title: "Name",
				field: "sort",
				formatter: "link",
				formatterParams: {
					labelField: "name",
					url: (cell) => {
						var handle = cell.getData().logohandle;
						return `https://www.vectorlogo.zone/logos/${handle}/`},
					target: "_blank",
				},
				headerFilter: "input",
				headerFilterFunc: nameFilter,
				responsive: 0,
				sorter: "string",
				width: 375,
			},
			{
				title: "Tags",
				field: "tags",
				formatter: tagFormatter,
				headerFilter: false,
				headerSort: false,
				responsive: 0,
				width: 375,
			},
		],
		height: "100%",
		initialFilter: [{ field: "ar21", type: "=", value: true }],
		initialSort: [{ column: "sort", dir: "asc" }],
		layout: "fitDataStretch",
		placeholder: "No matches",
		responsiveLayout: "hide",
		footerElement: `<span class="w-100 mx-2 my-1">
                <a href="https://www.vectorlogo.zone/"><img src="/favicon.svg" class="pe-2" style="height:1.2em;" alt="VLZ logo"/>VectorLogo.Zone</a> Reports
                <span id="rowcount" class="px-3">Rows: ${data.length.toLocaleString()}</span>
                <a class="d-none d-lg-block float-end" href="https://github.com/VectorLogoZone/vlz-report">Source</a>
            </span>`,
	});

    table.on("dataFiltered", function(filters, rows) {
        var el = document.getElementById('rowcount');
        if (filters && filters.length > 0) {
            el!.innerHTML = `Rows: ${rows.length.toLocaleString()} (of ${data.length.toLocaleString()})`;
        } else {
            el!.innerHTML = `Rows: ${data.length.toLocaleString()}`;
        }
    });


	document.getElementById('loading')!.style.display = 'none';
	document.getElementById('achtable')!.style.display = 'block';
}

main();
