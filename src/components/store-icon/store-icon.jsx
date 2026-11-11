const paths = {
  arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  diagonal: <><path d="M6 18 18 6M7 6h11v11" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.7 4.7" /></>,
  user: <><circle cx="12" cy="7.5" r="3.2" /><path d="M5 20v-2a5.3 5.3 0 0 1 5.3-5.3h3.4A5.3 5.3 0 0 1 19 18v2" /></>,
  bag: <><path d="M5 8h14l1.1 13H3.9L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  crown: <><path d="m3 7 5 4 4-7 4 7 5-4-2 10H5L3 7ZM6 20h12" /></>,
};

const StoreIcon = ({ name, size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.55"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {paths[name]}
  </svg>
);

export default StoreIcon;
