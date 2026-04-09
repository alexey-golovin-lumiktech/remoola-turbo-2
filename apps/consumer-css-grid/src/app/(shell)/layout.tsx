import { ShellClientWrapper } from './ShellClientWrapper';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  return <ShellClientWrapper>{children}</ShellClientWrapper>;
}
