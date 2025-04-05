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
  useReactTable,
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
} from "@tanstack/react-table";
import useLocalStorageState from "use-local-storage-state";
import type { Pkg } from "$data/schema.ts";
import { archivePkgUrl } from "$data/schema.ts";
import { versionListEqual, versionListLessThan } from "$data/versionList.ts";
import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { memoize } from "@std/cache/memoize";

// HACK: a module-level variable that is visible to the sorting predicate. This
// might be the only way to sort better matches before others.
let globalFilterModuleVar = "";

const columnHelper = createColumnHelper<Pkg>();
const columns = [
  columnHelper.accessor("name", {
    cell: (info) => (
      <a className="link" href={`/package/${info.getValue()}`}>
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
    meta: {
      extraClass: "whitespace-nowrap",
    },
  }),
  columnHelper.accessor("summary", {
    cell: (info) => info.getValue(),
    meta: {
      extraClass: "max-w-[60ch] truncate",
    },
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
        <a href={urlOnArchive} target="_blank" className={clsx("link")}>
          {archive}
        </a>
      ) : (
        archive
      );
    },
    filterFn: (row, columnId, filterValue) => {
      return filterValue?.includes(row.getValue(columnId));
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
    // We need this off so that it's possible to search for eg. "http" and get
    // useful results
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
          className={clsx("link", "block max-w-[40ch] truncate")}
        >
          {linkDisplay(url)}
        </a>
      );
    },
  }),
];

function SortIndicator({ status }: { status: SortDirection | false }) {
  if (status === "asc") {
    return <img className="inline" src={biChevronUp.src} />;
  } else if (status === "desc") {
    return <img className="inline" src={biChevronDown.src} />;
  } else {
    return null;
  }
}

function Header<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  if (header.isPlaceholder) return null;
  const canSort = header.column.getCanSort();
  return (
    <button
      className={canSort ? "btn" : ""}
      onClick={header.column.getToggleSortingHandler()}
      title={(header.column.columnDef.meta as { title?: string })?.title}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIndicator status={header.column.getIsSorted()} />
    </button>
  );
}

const linkDisplay = memoize((url: string) => {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const parsed = new URL(url);
  if (parsed.hostname === "github.com") {
    return "github";
  }
  if (parsed.hostname === "hg.sr.ht" || parsed.hostname === "git.sr.ht") {
    return "sourcehut";
  }
  if (parsed.hostname === "bitbucket.org") {
    return "bitbucket";
  }
  if (parsed.hostname === "gitlab.com") {
    return "gitlab";
  }
  if (parsed.hostname === "codeberg.org") {
    return "codeberg";
  }
  if (parsed.hostname === "elpa.gnu.org") {
    return "gnu elpa";
  }
});

/**
 * The page numbers and switch page buttons.
 * `canPrevious`, `canNext`, `pageIndex`, `pageCount` should be passed in by
 * getting the information from the table. This is to avoid having this
 * component read from things that are not in its input (ie. to make sure it is
 * pure).
 */
function Pages<T>({
  canPrevious,
  canNext,
  pageIndex,
  pageCount,
  table,
}: {
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
      className={clsx(
        "isolate inline-flex gap-2 rounded-md",
        "[&>button]:btn [&>button]:btn-style [&>button]:p-2",
      )}
    >
      <button disabled={!canPrevious} onClick={() => table.firstPage()}>
        <span className="sr-only">First</span>
        <img className="inline size-5" src={biChevronBarLeft.src} />
      </button>
      <button disabled={!canPrevious} onClick={() => table.previousPage()}>
        <span className="sr-only">Previous</span>
        <img className="inline size-5" src={biChevronLeft.src} />
      </button>
      <span className="color-secondary w-[15ch] px-3 py-2 text-center text-sm font-semibold">
        page {pageIndex + 1}/{Math.max(pageCount, 1)}
      </span>
      <button disabled={!canNext} onClick={() => table.nextPage()}>
        <span className="sr-only">Next</span>
        <img className="inline size-5" src={biChevronRight.src} />
      </button>
      <button disabled={!canNext} onClick={() => table.lastPage()}>
        <span className="sr-only">Last</span>
        <img className="inline size-5" src={biChevronBarRight.src} />
      </button>
    </nav>
  );
}

export default function PaginatedTable({
  data,
  filter = true,
}: {
  data: Pkg[];
  filter?: boolean;
}) {
  // Hook up archive filtering state
  const archives = useMemo(() => {
    // FIXME: use provided column faceting features instead of this
    const archiveSet = new Set<string>();
    for (const row of data) {
      archiveSet.add(row.archive);
    }
    return [...archiveSet];
  }, [data]);
  const [
    archiveFiltering,
    setArchiveFiltering,
    { removeItem: resetArchiveFiltering },
  ] = useLocalStorageState("archiveFiltering", {
    defaultValue: Object.fromEntries(
      archives.map((archive) => [archive, archive !== "melpa-stable"]),
    ),
  });
  useEffect(() => {
    if (Object.keys(archiveFiltering).length !== archives.length) {
      console.log(
        "localStorage archiveFiltering length mismatch, resetting filtering preferences",
      );
      resetArchiveFiltering();
    }
  }, [archiveFiltering, archives]);
  // Hook up pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 200,
  } as PaginationState);

  const [globalFilterState, setGlobalFilterState] = useState("");

  // Create the table instance
  const table = useReactTable({
    data: data,
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

    state: { pagination, globalFilter: globalFilterState },
  });
  useEffect(() => {
    const archiveColumn = table.getColumn("archive");
    if (archiveColumn === undefined) {
      return;
    }
    archiveColumn.setFilterValue(
      // {a: true, b: false}
      // -> [["a", true], ["b", false]] (entries array for filtering)
      // -> [["a", true]] (only keep entries whose value is truthy)
      // -> ["a"] (only keep keys)
      Object.entries(archiveFiltering)
        .filter(([_k, v]) => v)
        .map(([k, _v]) => k),
    );
  }, [archiveFiltering]);

  const matchedEntryCount = table.getPrePaginationRowModel().rows.length;

  return (
    <div>
      <div>
        {" "}
        {/* Input and filter buttons */}
        {/* Input style from https://tailwindcss.com/plus/ui-blocks/application-ui/forms/input-groups */}
        {filter && (
          <div
            className={clsx(
              "color-input",
              "flex items-center rounded-md bg-white outline-1 -outline-offset-1",
              "has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2",
            )}
          >
            <input
              type="text"
              placeholder="Filter packages by name or summary..."
              className="color-bg-secondary block min-w-0 grow rounded-md px-2 py-1.5 focus:outline-none"
              onChange={(e) => {
                // Synchronize with the external-to-react JS variable
                // This is to expose it to be used in the sorting predicate
                globalFilterModuleVar = `${e.target.value}`;
                setGlobalFilterState(globalFilterModuleVar);
              }}
            />
          </div>
        )}
        <div>
          <div className="mt-3 flex flex-wrap space-y-3 space-x-2">
            {archives.map((archive) => (
              <div key={archive}>
                <input
                  type="checkbox"
                  checked={archiveFiltering[archive]}
                  onChange={(e) => {
                    setArchiveFiltering({
                      ...archiveFiltering,
                      [archive]: e.target.checked,
                    });
                  }}
                  className="peer sr-only"
                  id={`check-${archive}`}
                ></input>
                <label
                  htmlFor={`check-${archive}`}
                  className={clsx(
                    "cursor-pointer select-none",
                    "rounded-lg px-2 py-1",
                    "color-chip",
                  )}
                >
                  {archive}
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap space-x-2">
            <button
              className="btn btn-style p-1"
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
              className="btn btn-style px-2 py-0"
              onClick={resetArchiveFiltering}
            >
              reset to default
            </button>
          </div>
        </div>
      </div>
      <div className="mb-2">{matchedEntryCount} matching entries</div>
      <Pages
        canPrevious={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        table={table}
      />
      <div className="overflow-x-auto">
        <table className="mt-2 min-w-[80%] table-fixed text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="pr-4 text-left">
                    <Header header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={clsx(
                      "py-1 pr-4",
                      (cell.column.columnDef.meta as { extraClass?: string })
                        ?.extraClass,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
      {matchedEntryCount !== 0 && (
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
