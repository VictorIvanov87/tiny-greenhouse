import type { ReactNode } from 'react';

type WizardLayoutProps = {
  children: ReactNode;
  aside?: ReactNode;
};

const WizardLayout = ({ children, aside }: WizardLayoutProps) => (
  <div className="wizard-layout">
    <div className="wizard-layout__main min-w-0">{children}</div>
    {aside ? (
      <aside className="wizard-layout__aside min-w-0">{aside}</aside>
    ) : null}
  </div>
);

export default WizardLayout;
