import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const intervalOptions = [
  { label: '1 Minuto', value: 60000 },
  { label: '5 Minutos', value: 300000 },
  { label: '15 Minutos', value: 900000 },
  { label: '30 Minutos', value: 1800000 },
  { label: '1 Hora', value: 3600000 },
  { label: '6 Horas', value: 21600000 },
  { label: '12 Horas', value: 43200000 },
  { label: '24 Horas', value: 86400000 },
];

export default function Dropdown({ onChange }) {
  const [selected, setSelected] = useState(1800000);
  // Only read localStorage on client
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('intervalMs');
      if (saved) setSelected(Number(saved));
    }
  }, []);

  const handleIntervalChange = (value) => {
    setSelected(value);
    localStorage.setItem('intervalMs', value);
    // reset countdown starting point
    try {
      const now = Date.now();
      localStorage.setItem('lastRefreshAt', now.toString());
      localStorage.setItem('nextPersistAt', (now + Number(value)).toString());
    } catch {}
    // Notify other components within the same tab immediately
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('intervalMsChanged'));
      }
    } catch {}
    if (onChange) onChange(value);
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {intervalOptions.find((opt) => opt.value === selected)?.label || 'Intervalo'}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {intervalOptions.map((opt) => (
              <Menu.Item key={opt.value}>
                {({ active }) => (
                  <a
                    href="#"
                    onClick={() => handleIntervalChange(opt.value)}
                    className={classNames(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block px-4 py-2 text-sm'
                    )}
                  >
                    {opt.label}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

// import React, { Fragment, useState } from "react";
// import { Menu, Transition } from "@headlessui/react";
// import { ChevronDownIcon } from "@heroicons/react/20/solid";

// function classNames(...classes) {
//   return classes.filter(Boolean).join(" ");
// }

// export default function Dropdown({ onChange }) {
//   const [selectedInterval, setSelectedInterval] = useState("1 Minute");

//   const handleIntervalChange = (interval) => {
//     setSelectedInterval(interval);
//     onChange(interval);
//   };

//   const intervalOptions = ["1 Minute", "5 Minutes", "15 Minutes"];

//   return (
//     <Menu as="div" className="relative inline-block text-left">
//       <div>
//         <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
//           {selectedInterval}
//           <ChevronDownIcon
//             className="-mr-1 h-5 w-5 text-gray-400"
//             aria-hidden="true"
//           />
//         </Menu.Button>
//       </div>

//       <Transition
//         as={Fragment}
//         enter="transition ease-out duration-100"
//         enterFrom="transform opacity-0 scale-95"
//         enterTo="transform opacity-100 scale-100"
//         leave="transition ease-in duration-75"
//         leaveFrom="transform opacity-100 scale-100"
//         leaveTo="transform opacity-0 scale-95"
//       >
//         <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
//           <div className="py-1">
//             {intervalOptions.map((intervalOption) => (
//               <Menu.Item key={intervalOption}>
//                 {({ active }) => (
//                   <a
//                     href="#"
//                     onClick={() => handleIntervalChange(intervalOption)}
//                     className={classNames(
//                       active ? "bg-gray-100 text-gray-900" : "text-gray-700",
//                       "block px-4 py-2 text-sm"
//                     )}
//                   >
//                     {intervalOption}
//                   </a>
//                 )}
//               </Menu.Item>
//             ))}
//           </div>
//         </Menu.Items>
//       </Transition>
//     </Menu>
//   );
// }
//             {intervalOptions.map((intervalOption) => (
//               <Menu.Item key={intervalOption}>
//                 {({ active }) => (
//                   <a
//                     href="#"
//                     onClick={() => handleIntervalChange(intervalOption)}
//                     className={classNames(
//                       active ? "bg-gray-100 text-gray-900" : "text-gray-700",
//                       "block px-4 py-2 text-sm"
//                     )}
//                   >
//                     {intervalOption}
//                   </a>
//                 )}
//               </Menu.Item>
//             ))}
//           </div>
//         </Menu.Items>
//       </Transition>
//     </Menu>
//   );
// }
