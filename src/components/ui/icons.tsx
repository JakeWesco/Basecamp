// One icon set: Phosphor, light weight everywhere. Import icons from here, not
// from the package, so the weight stays the same across the app. The SSR build
// works in server and client components alike.
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  CaretDown as CaretDownIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Gear as GearIcon,
  House as HouseIcon,
  Info as InfoIcon,
  Microphone as MicrophoneIcon,
  MicrophoneSlash as MicrophoneSlashIcon,
  Palette as PaletteIcon,
  Receipt as ReceiptIcon,
  SignOut as SignOutIcon,
  Tag as TagIcon,
  Tray as TrayIcon,
  UsersThree as UsersThreeIcon,
  UserCircle as UserCircleIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  WarningCircle as WarningCircleIcon,
  WhatsappLogo as WhatsappLogoIcon,
  X as XIcon,
} from "@phosphor-icons/react/dist/ssr";

function light(Icon: ComponentType<IconProps>, name: string) {
  function Light(props: IconProps) {
    return <Icon weight="light" aria-hidden="true" {...props} />;
  }
  Light.displayName = name;
  return Light;
}

export type { IconProps };
export const CaretDown = light(CaretDownIcon, "CaretDown");
export const Check = light(CheckIcon, "Check");
export const CheckCircle = light(CheckCircleIcon, "CheckCircle");
export const Gear = light(GearIcon, "Gear");
export const House = light(HouseIcon, "House");
export const Info = light(InfoIcon, "Info");
export const Microphone = light(MicrophoneIcon, "Microphone");
export const MicrophoneSlash = light(MicrophoneSlashIcon, "MicrophoneSlash");
export const Palette = light(PaletteIcon, "Palette");
export const Receipt = light(ReceiptIcon, "Receipt");
export const SignOut = light(SignOutIcon, "SignOut");
export const Tag = light(TagIcon, "Tag");
export const Tray = light(TrayIcon, "Tray");
export const UsersThree = light(UsersThreeIcon, "UsersThree");
export const UserCircle = light(UserCircleIcon, "UserCircle");
export const Moon = light(MoonIcon, "Moon");
export const Sun = light(SunIcon, "Sun");
export const WarningCircle = light(WarningCircleIcon, "WarningCircle");
export const WhatsappLogo = light(WhatsappLogoIcon, "WhatsappLogo");
export const X = light(XIcon, "X");
