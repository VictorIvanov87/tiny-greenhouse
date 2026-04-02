import type { ReactNode } from 'react';

type WizardLayoutProps = {
  children: ReactNode;
  aside?: ReactNode;
};

const WizardLayout = ({ children, aside }: WizardLayoutProps) => (
  <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
    <div className="min-w-0">{children}</div>
    {aside ? <aside className="min-w-0">{aside}</aside> : null}
  </div>
);

export default WizardLayout;
