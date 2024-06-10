import React, { ComponentType, SVGProps } from 'react';
import clsx from 'clsx';
import EasyUseIcon from '@iconscout/unicons/svg/line/user-check.svg';
import FastIcon from '@iconscout/unicons/svg/line/dashboard.svg';

type FeatureItem = {
  title: string;
  description: JSX.Element;
  href?: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    description: (
      <>
        Drop-in components make it easy to add ML capabilities to your Grafana plugins.
      </>
    ),
    Icon: EasyUseIcon,
  },
  {
    title: 'Fast',
    description: (
      <>
        All algorithms are compiled to WebAssembly, which allows for fast and efficient execution in the browser.
      </>
    ),
    Icon: FastIcon,
  },
];

function Feature({ title, description, href, Icon }: FeatureItem) {
  return (
    <div className="col">
      <div className={clsx('card card--full-height padding--md')}>
        <span className="avatar margin-bottom--sm">
          {Icon && <Icon aria-hidden="true" style={{ fill: 'currentColor', width: 24 }} />}
          <h3 className="margin-bottom--none text--normal">{title}</h3>
        </span>
        <p className="margin-bottom--none">{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className="margin-bottom--lg">
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
