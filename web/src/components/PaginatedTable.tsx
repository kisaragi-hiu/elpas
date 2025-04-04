// DONE: sorting buttons
// DONE: filtering input, searching through name and summary
// DONE: link to source ELPA
// DONE: link to package URL
// DONE: pagination
// DONE: enable/disable archives, keep melpa stable disabled by default
// DONE: exact matches on top
// DONE: single package pages

import biChevronUp from "bootstrap-icons/icons/chevron-up.svg";
import biChevronDown from "bootstrap-icons/icons/chevron-down.svg";
import biChevronRight from "bootstrap-icons/icons/chevron-right.svg";
import biChevronLeft from "bootstrap-icons/icons/chevron-left.svg";
import biChevronBarRight from "bootstrap-icons/icons/chevron-bar-right.svg";
import biChevronBarLeft from "bootstrap-icons/icons/chevron-bar-left.svg";

import {
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  sortingFns,
  type Header,
  type SortDirection,
  type PaginationState,
  type Table,
  getFilteredRowModel,
} from "@tanstack/solid-table";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal, createEffect, For, mergeProps } from "solid-js";
import clsx from "clsx";

import type { Pkg } from "$data/schema.ts";
import { archivePkgUrl } from "$data/schema.ts";
import { versionListEqual, versionListLessThan } from "$data/versionList.ts";

// HACK: a module-level variable that is visible to the sorting predicate. This
// might be the only way to sort better matches before others.
let globalFilterModuleVar = "";

const columnHelper = createColumnHelper<Pkg>();
const columns = [
  columnHelper.accessor("name", {
    cell: (info) => (
      <a class="link" href={`/package/${info.getValue()}`}>
        {info.getValue()}
      </a>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.name;
      const b = rowB.original.name;
      if (a === b) {
        return 0;
      }
      // Exact match first
      if (globalFilterModuleVar === a) {
        return -1;
      } else if (globalFilterModuleVar === b) {
        return 1;
      }
      // Prefix match first
      const aStartsWith = a.startsWith(globalFilterModuleVar);
      const bStartsWith = b.startsWith(globalFilterModuleVar);
      if (aStartsWith && !bStartsWith) {
        return -1;
      } else if (bStartsWith && !aStartsWith) {
        return 1;
      }
      // Put numbers on top, like the MELPA list
      return sortingFns.basic(rowA, rowB, columnId);
    },
  }),
  columnHelper.accessor("summary", {
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("ver", {
    cell: (info) => info.getValue().join("."),
    header: () => "version",
    enableGlobalFilter: false,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.ver;
      const b = rowB.original.ver;
      return versionListLessThan(a, b) ? -1 : versionListEqual(a, b) ? 0 : 1;
    },
    meta: {
      // 13ch to accomodate the longest version number strings: the MELPA style
      // "20230102.1234" strings
      extraClass: "w-[13ch]",
    },
  }),
  columnHelper.accessor("archive", {
    enableGlobalFilter: false,
    cell: (info) => {
      const archive = info.getValue();
      const urlOnArchive = archivePkgUrl(archive, info.row.getValue("name"));

      return urlOnArchive ? (
        <a
          href={urlOnArchive}
          target="_blank"
          class={clsx("link", "block max-w-[40ch] truncate")}
        >
          {archive}
        </a>
      ) : (
        archive
      );
    },
    filterFn: (row, columnId, filterValue) => {
      return filterValue?.includes(row.getValue(columnId));
    },
    meta: {
      extraClass: "w-[12ch]",
    },
  }),
  columnHelper.accessor("downloads", {
    enableGlobalFilter: false,
    cell: (info) => info.getValue() ?? "-",
    sortUndefined: "last",
    meta: {
      extraClass: "w-[14ch]",
      title: "Only available from Melpa",
    },
  }),
  columnHelper.accessor("url", {
    enableGlobalFilter: false,
    cell: (info) => {
      const url = info.getValue();
      if (url === undefined) {
        return "-";
      }
      return (
        <a
          href={info.getValue()}
          target="_blank"
          class={clsx("link", "block max-w-[40ch] truncate")}
        >
          {linkDisplay(url)}
        </a>
      );
    },
  }),
];

function SortIndicator({ status }: { status: SortDirection | false }) {
  if (status === "asc") {
    return <img class="inline" src={biChevronUp.src} />;
  } else if (status === "desc") {
    return <img class="inline" src={biChevronDown.src} />;
  } else {
    return null;
  }
}

function Header<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  if (header.isPlaceholder) return null;
  const canSort = header.column.getCanSort();
  return (
    <button
      class={canSort ? "btn" : ""}
      onClick={header.column.getToggleSortingHandler()}
      title={(header.column.columnDef.meta as { title?: string })?.title}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIndicator status={header.column.getIsSorted()} />
    </button>
  );
}

function linkDisplay(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * The page numbers and switch page buttons.
 * `canPrevious`, `canNext`, `pageIndex`, `pageCount` should be passed in by
 * getting the information from the table. This is to avoid having this
 * component read from things that are not in its input (ie. to make sure it is
 * pure).
 */
function Pages<T>(props: {
  canPrevious: boolean;
  canNext: boolean;
  pageIndex: number;
  pageCount: number;
  table: Table<T>;
}) {
  // Style based on the Tailwind Plus Pagination
  // https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/pagination
  // The key insight is using inline-flex + items-center to align things,
  // especially images and text.
  return (
    <nav
      aria-label="Pagination"
      class={clsx(
        "isolate inline-flex gap-2 rounded-md",
        "[&>button]:btn [&>button]:btn-style [&>button]:p-2",
      )}
    >
      <button
        disabled={!props.canPrevious}
        onClick={() => props.table.firstPage()}
      >
        <span class="sr-only">First</span>
        <img class="inline size-5" src={biChevronBarLeft.src} />
      </button>
      <button
        disabled={!props.canPrevious}
        onClick={() => props.table.previousPage()}
      >
        <span class="sr-only">Previous</span>
        <img class="inline size-5" src={biChevronLeft.src} />
      </button>
      <span class="w-[15ch] px-3 py-2 text-center text-sm font-semibold text-gray-700">
        page {props.pageIndex + 1}/{Math.max(props.pageCount, 1)}
      </span>
      <button disabled={!props.canNext} onClick={() => props.table.nextPage()}>
        <span class="sr-only">Next</span>
        <img class="inline size-5" src={biChevronRight.src} />
      </button>
      <button disabled={!props.canNext} onClick={() => props.table.lastPage()}>
        <span class="sr-only">Last</span>
        <img class="inline size-5" src={biChevronBarRight.src} />
      </button>
    </nav>
  );
}

export default function PaginatedTable(props: {
  data: Pkg[];
  filter?: boolean;
}) {
  // The first object is used as the default values.
  const finalProps = mergeProps({ filter: true }, props);
  // Hook up archive filtering state
  const archives = (() => {
    // FIXME: use provided column faceting features instead of this
    const archiveSet = new Set<string>();
    for (const row of finalProps.data) {
      archiveSet.add(row.archive);
    }
    return [...archiveSet];
  })();
  const initArchiveFiltering = Object.fromEntries(
    archives.map((archive) => [archive, archive !== "melpa-stable"]),
  );
  const [archiveFiltering, setArchiveFiltering] = makePersisted(
    createSignal(initArchiveFiltering, { equals: false }),
    { name: "archiveFiltering" },
  );
  function resetArchiveFiltering() {
    setArchiveFiltering(initArchiveFiltering);
  }
  createEffect(() => {
    if (Object.keys(archiveFiltering()).length !== archives.length) {
      console.log(
        "localStorage archiveFiltering length mismatch, resetting filtering preferences",
      );
      resetArchiveFiltering();
    }
  });
  // Hook up pagination
  const [pagination, setPagination] = createSignal({
    pageIndex: 0,
    pageSize: 200,
  } as PaginationState);

  const [globalFilterState, setGlobalFilterState] = createSignal("");

  // Create the table instance
  const table = createSolidTable({
    data: finalProps.data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableSortingRemoval: false,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnOrder: ["archive", "name", "summary", "version"],
    },

    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,

    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    onGlobalFilterChange: setGlobalFilterState,

    state: {
      get pagination() {
        return pagination();
      },
      get globalFilter() {
        return globalFilterState();
      },
    },
  });
  createEffect(() => {
    const archiveColumn = table.getColumn("archive");
    if (archiveColumn === undefined) {
      return;
    }
    archiveColumn.setFilterValue(
      // {a: true, b: false}
      // -> [["a", true], ["b", false]] (entries array for filtering)
      // -> [["a", true]] (only keep entries whose value is truthy)
      // -> ["a"] (only keep keys)
      Object.entries(archiveFiltering())
        .filter(([_k, v]) => v)
        .map(([k, _v]) => k),
    );
  });

  const matchedEntryCount = () => table.getPrePaginationRowModel().rows.length;

  return (
    <div>
      <div>
        {" "}
        {/* Input and filter buttons */}
        {/* Input style from https://tailwindcss.com/plus/ui-blocks/application-ui/forms/input-groups */}
        {finalProps.filter && (
          <div
            class={clsx(
              "flex items-center rounded-md bg-white outline-1 -outline-offset-1 outline-gray-300",
              "has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-blue-600",
            )}
          >
            <input
              type="text"
              placeholder="Filter packages by name or summary..."
              class="block min-w-0 grow px-2 py-1.5 focus:outline-none"
              onInput={(e) => {
                // Synchronize with the external-to-react JS variable
                // This is to expose it to be used in the sorting predicate
                globalFilterModuleVar = `${e.target.value}`;
                setGlobalFilterState(globalFilterModuleVar);
              }}
            />
          </div>
        )}
        <div>
          <div class="mt-3 flex flex-wrap space-y-3 space-x-2">
            <For each={archives}>
              {(archive) => (
                <div>
                  <input
                    type="checkbox"
                    checked={archiveFiltering()[archive]}
                    onInput={(e) => {
                      setArchiveFiltering((obj) => {
                        obj[archive] = e.target.checked;
                        return obj;
                      });
                    }}
                    class="peer sr-only"
                    id={`check-${archive}`}
                  ></input>
                  <label
                    for={`check-${archive}`}
                    class={clsx(
                      "cursor-pointer select-none",
                      "rounded-lg px-2 py-1",
                      "bg-gray-200 hover:bg-gray-100",
                      "peer-checked:bg-gray-800 peer-checked:hover:bg-gray-700",
                      "peer-checked:text-white",
                    )}
                  >
                    {archive}
                  </label>
                </div>
              )}
            </For>
          </div>
          <div class="flex flex-wrap space-x-2">
            <button
              class="btn btn-style p-1"
              onClick={() => {
                setArchiveFiltering(
                  Object.fromEntries(
                    archives.map((archive) => [archive, false]),
                  ),
                );
              }}
            >
              deselect all
            </button>
            <button
              class="btn btn-style px-2 py-0"
              onClick={resetArchiveFiltering}
            >
              reset to default
            </button>
          </div>
        </div>
      </div>
      <div class="mb-2">{matchedEntryCount()} matching entries</div>
      <Pages
        canPrevious={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        table={table}
      />
      <div class="overflow-x-auto">
        <table class="mt-2 text-sm">
          <thead>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <tr>
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <th class="pr-4 text-left">
                        <Header header={header} />
                      </th>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </thead>
          <tbody>
            <For each={table.getRowModel().rows}>
              {(row) => (
                <tr>
                  <For each={row.getVisibleCells()}>
                    {(cell) => (
                      <td
                        class={clsx(
                          "py-1 pr-4",
                          (
                            cell.column.columnDef.meta as {
                              extraClass?: string;
                            }
                          )?.extraClass,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
          <tfoot>
            <For each={table.getFooterGroups()}>
              {(footerGroup) => (
                <tr>
                  <For each={footerGroup.headers}>
                    {(header) => (
                      <th>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext(),
                            )}
                      </th>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tfoot>
        </table>
      </div>
      {matchedEntryCount() !== 0 && (
        <Pages
          canPrevious={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
          pageIndex={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          table={table}
        />
      )}
    </div>
  );
}
