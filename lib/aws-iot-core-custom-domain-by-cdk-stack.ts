import * as cdk from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import * as route53 from '@aws-cdk/aws-route53';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';

export class AwsIotCoreCustomDomainByCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zoneName: string = this.node.tryGetContext('zoneName');
    const atsEndpoint: string = this.node.tryGetContext('atsEndpoint');

    const hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName,
    });

    new route53.CnameRecord(this, 'CnameRecord', {
      zone: hostedZone,
      recordName: `iot.${hostedZone.zoneName}`,
      domainName: atsEndpoint,
    });

    // 本来はスタックを分けるべき
    // なぜなら、Freenom で取得したドメインの NS レコードを設定してからじゃないと、ここの検証が通らないから
    // とはいえ、一括でデプロイしても、ここが検証通るまで IN_PROGRESS になるので、
    // その間に、NS レコードを設定してあげれば、一応通ることは確認した
    const certificate = new certificatemanager.DnsValidatedCertificate(
      this,
      'Certificate',
      {
        domainName: `iot.${hostedZone.zoneName}`,
        hostedZone,
        validationMethod: certificatemanager.ValidationMethod.DNS,
      }
    );

    // [NOTE] 1度作成すると、無効にしてから7日経過しないと削除できないので注意
    // new iot.CfnDomainConfiguration(this, 'AWSManagedDomain', {
    //   domainConfigurationName: 'aws-managed-domain-config',
    //   domainConfigurationStatus: 'ENABLED',
    //   serviceType: 'DATA',
    // });

    new iot.CfnDomainConfiguration(this, 'CustomDomain', {
      domainConfigurationName: 'custom-domain-config',
      domainConfigurationStatus: 'ENABLED',
      domainName: `iot.${hostedZone.zoneName}`,
      serverCertificateArns: [certificate.certificateArn],
      serviceType: 'DATA',
    });
  }
}
