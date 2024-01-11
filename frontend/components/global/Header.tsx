"use client";

import Link from "next/link";
import React from "react";

import Logo from "./Logo";
import { NavLink } from "./NavLink";
import TasksMenu from "./TasksMenu";
import UserMenu from "./UserMenu";

const navItems = [
  {
    title: "Tasks",
    href: "/tasks",
  },
  {
    title: "Experiments",
    href: "/experiments",
  },
  {
    title: "Data",
    href: "/data",
  },
];

export default function Header() {
  return (
    <nav className="flex items-center justify-between p-4 border-b bg-background">
      <Link href="/" className="flex items-center gap-4 text-lg font-bold uppercase font-heading whitespace-nowrap">
        <Logo className="w-auto h-8 text-primary" /> Lab Exchange
      </Link>
      <>
        <div className="flex gap-4 ml-4 mr-auto sm:ml-8 md:ml-16 sm:gap-8">
          {navItems.map((navItem, idx) => (
            <NavLink key={idx} href={navItem.href} className="font-mono font-bold uppercase">
              {navItem.title}
            </NavLink>
          ))}
        </div>
        <TasksMenu />
        <UserMenu />
      </>
    </nav>
  );
}
