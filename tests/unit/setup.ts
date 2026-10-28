// Node 24 has no Temporal yet (Node 26 does); browsers get the same polyfill only where it's missing.
// oxlint-disable-next-line import/no-unassigned-import -- installs the global
import 'temporal-polyfill/global'
