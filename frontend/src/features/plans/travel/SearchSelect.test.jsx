import React, { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchSelect } from "./SearchSelect";
import { countries } from "../../onboarding/catalogs";

afterEach(cleanup);
const options = countries.map((c) => ({value: c.code, label: c.name}));
function Field({changed}) {
  const [value, setValue] = useState("AT");
  return <><SearchSelect label="Country" options={options} value={value} onChange={(next) => {setValue(next); changed(next);}} required /><button>Outside</button></>;
}
test("searches name and code, bounds each page, and selects through the keyboard", async () => {
  const changed = vi.fn(), user = userEvent.setup();
  render(<Field changed={changed}/>);
  const field = screen.getByRole('combobox', {name: 'Country'});
  expect(field.value).toBe('Austria');
  await user.click(field);
  expect(screen.getAllByRole('option')).toHaveLength(10);
  const first = screen.getAllByRole('option')[0].textContent;
  await user.click(screen.getByRole('button', {name: 'Next Country choices'}));
  expect(screen.getAllByRole('option')).toHaveLength(10);
  expect(screen.getAllByRole('option')[0].textContent).not.toBe(first);
  await user.click(field);
  await user.type(field, 'Hungary');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  await user.keyboard('{ArrowDown}{Enter}');
  expect(changed).toHaveBeenLastCalledWith('HU');
  expect(field.value).toBe('Hungary');
  expect(screen.queryByRole('listbox')).toBeNull();
  await user.click(field);
  await user.type(field, 'AT');
  expect(screen.getByRole('option', {name: 'Austria'})).toBeTruthy();
});
test("unselected text cannot overwrite preloaded criteria; Escape and outside focus restore the selection", async () => {
  const changed = vi.fn(), user = userEvent.setup();
  render(<Field changed={changed}/>);
  const field = screen.getByRole('combobox', {name: 'Country'});
  await user.click(field);
  await user.type(field, 'no-such-country');
  expect(screen.getByText(/No matches/)).toBeTruthy();
  await user.keyboard('{Enter}{Escape}');
  expect(field.value).toBe('Austria');
  await user.click(field);
  await user.type(field, 'Italy');
  await user.click(screen.getByRole('button', {name: 'Outside'}));
  expect(field.value).toBe('Austria');
  expect(changed).not.toHaveBeenCalled();
  await user.click(field);
  await user.keyboard('{PageDown}{ArrowDown}{Enter}');
  expect(changed).toHaveBeenCalledOnce();
  expect(field.value).toBe(options[10].label);
});
